import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFaceApi } from "@/hooks/useFaceApi";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Camera, Loader2, AlertTriangle, CheckCircle, UserCheck, ScanFace, Users
} from "lucide-react";

interface RecognizedStudent {
  user_id: string;
  name: string;
  time: string;
}

const FaceAttendance = () => {
  const { profile, user, primaryRole } = useAuth();
  const { modelsLoaded, loadingProgress, detectFace, matchFace } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [storedFaces, setStoredFaces] = useState<{ user_id: string; descriptor: Float32Array }[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [markedToday, setMarkedToday] = useState<Set<string>>(new Set());
  const [recentlyMarked, setRecentlyMarked] = useState<RecognizedStudent[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classes, setClasses] = useState<{ id: string; class_name: string; section: string | null }[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

  const today = new Date().toISOString().split("T")[0];
  const isStaff = primaryRole === "FOUNDER" || primaryRole === "PRINCIPAL" || primaryRole === "TEACHER";

  // Load classes
  useEffect(() => {
    if (!profile?.institution_id || !isStaff) return;
    supabase
      .from("classes")
      .select("id, class_name, section")
      .eq("institution_id", profile.institution_id)
      .then(({ data }) => setClasses(data || []));
  }, [profile?.institution_id, isStaff]);

  // Load stored face data & today's attendance
  const loadData = useCallback(async () => {
    if (!profile?.institution_id) return;
    const instId = profile.institution_id;

    // Get students for selected class or all
    let studentQuery = supabase.from("students").select("user_id, class_id").eq("institution_id", instId);
    if (selectedClassId) studentQuery = studentQuery.eq("class_id", selectedClassId);
    const { data: students } = await studentQuery;
    if (!students?.length) {
      setStoredFaces([]);
      setTotalStudents(0);
      return;
    }

    setTotalStudents(students.length);
    const userIds = students.map(s => s.user_id);

    const [faceRes, profileRes, attRes] = await Promise.all([
      supabase.from("face_data").select("user_id, face_descriptor").in("user_id", userIds),
      supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
      supabase.from("attendance").select("student_id").eq("institution_id", instId).eq("date", today),
    ]);

    const pMap: Record<string, string> = {};
    profileRes.data?.forEach(p => { pMap[p.user_id] = p.full_name; });
    setProfileMap(pMap);

    const faces = (faceRes.data || []).map(f => ({
      user_id: f.user_id,
      descriptor: new Float32Array(f.face_descriptor as number[]),
    }));
    setStoredFaces(faces);

    // Today's already-marked
    const marked = new Set((attRes.data || []).map(a => a.student_id));
    setMarkedToday(marked);
  }, [profile?.institution_id, selectedClassId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime attendance subscription
  useEffect(() => {
    if (!profile?.institution_id) return;
    const channel = supabase
      .channel("face-attendance-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "attendance",
        filter: `institution_id=eq.${profile.institution_id}`,
      }, (payload) => {
        const newRow = payload.new as any;
        if (newRow.date === today) {
          setMarkedToday(prev => new Set([...prev, newRow.student_id]));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.institution_id, today]);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError("Unable to access camera.");
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    setScanning(false);
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const markAttendance = async (studentUserId: string) => {
    if (!profile?.institution_id || !user?.id) return;

    // Need to find student record ID and class_id
    const { data: student } = await supabase
      .from("students")
      .select("id, class_id")
      .eq("user_id", studentUserId)
      .eq("institution_id", profile.institution_id)
      .single();

    if (!student) return;

    const { error: insertErr } = await supabase.from("attendance").insert({
      institution_id: profile.institution_id,
      student_id: student.id,
      class_id: student.class_id || selectedClassId || "",
      date: today,
      status: "Present",
      marked_by: user.id,
    });

    if (insertErr) {
      // Likely duplicate
      if (insertErr.message.includes("duplicate") || insertErr.message.includes("unique")) return;
      console.error("Attendance insert error:", insertErr);
      return;
    }

    setMarkedToday(prev => new Set([...prev, student.id]));
    setRecentlyMarked(prev => [
      {
        user_id: studentUserId,
        name: profileMap[studentUserId] || "Unknown",
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  const startScanning = () => {
    if (!videoRef.current || !modelsLoaded || storedFaces.length === 0) return;
    scanningRef.current = true;
    setScanning(true);

    const cooldown = new Set<string>();

    const scanLoop = async () => {
      if (!scanningRef.current || !videoRef.current) return;

      try {
        const result = await detectFace(videoRef.current);
        if (result) {
          const match = matchFace(result.descriptor, storedFaces, 0.5);
          if (match && !cooldown.has(match.user_id)) {
            cooldown.add(match.user_id);
            await markAttendance(match.user_id);
            // Cooldown for 10 seconds to prevent re-scans
            setTimeout(() => cooldown.delete(match.user_id), 10000);
          }
        }
      } catch (err) {
        console.error("Scan error:", err);
      }

      if (scanningRef.current) {
        // Scan every 1.5 seconds
        setTimeout(() => {
          animFrameRef.current = requestAnimationFrame(scanLoop);
        }, 1500);
      }
    };

    animFrameRef.current = requestAnimationFrame(scanLoop);
  };

  const stopScanning = () => {
    scanningRef.current = false;
    setScanning(false);
    cancelAnimationFrame(animFrameRef.current);
  };

  const presentCount = markedToday.size;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanFace className="w-6 h-6 text-primary" />
            Face Recognition Attendance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatic attendance marking using face recognition
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <Users className="w-4 h-4 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <UserCheck className="w-4 h-4 text-primary mb-1" />
            <p className="text-2xl font-bold">{storedFaces.length}</p>
            <p className="text-xs text-muted-foreground">Faces Registered</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <CheckCircle className="w-4 h-4 text-primary mb-1" />
            <p className="text-2xl font-bold text-primary">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Present Today</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <ScanFace className="w-4 h-4 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">Attendance Rate</p>
          </div>
        </div>

        {/* Class selector */}
        {isStaff && classes.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-sm font-medium mb-2 block">Filter by Class</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="h-10 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} {c.section || ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Model loading */}
        {!modelsLoaded && (
          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">Loading AI Models</p>
              <p className="text-xs text-muted-foreground">{loadingProgress}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Camera */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative aspect-video bg-muted flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                muted
                playsInline
              />
              {!cameraActive && (
                <div className="text-center p-8">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Start camera to begin scanning</p>
                </div>
              )}
              {scanning && (
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                  Scanning...
                </div>
              )}
            </div>

            <div className="p-4 flex flex-wrap gap-3">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  disabled={!modelsLoaded}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Start Camera
                </button>
              ) : (
                <>
                  {!scanning ? (
                    <button
                      onClick={startScanning}
                      disabled={storedFaces.length === 0}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <ScanFace className="w-4 h-4" />
                      Start Scanning
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold inline-flex items-center gap-2"
                    >
                      Stop Scanning
                    </button>
                  )}
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Stop Camera
                  </button>
                </>
              )}
            </div>

            {storedFaces.length === 0 && modelsLoaded && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  No registered faces found. Please register student faces first.
                </div>
              </div>
            )}
          </div>

          {/* Recently marked */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Recently Marked Present
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recentlyMarked.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  No students marked yet
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentlyMarked.map((s, i) => (
                    <li key={i} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.time}</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        Present
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FaceAttendance;
