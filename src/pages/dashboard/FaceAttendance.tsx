import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFaceApi } from "@/hooks/useFaceApi";
import { useCamera } from "@/hooks/useCamera";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Camera, Loader2, AlertTriangle, CheckCircle, UserCheck, ScanFace, Users, RefreshCw, MonitorSpeaker
} from "lucide-react";
import * as faceapi from "face-api.js";

interface RecognizedStudent {
  user_id: string;
  name: string;
  time: string;
}

const FaceAttendance = () => {
  const { profile, user, primaryRole } = useAuth();
  const { modelsLoaded, loadingProgress, loadError, detectAllFaces, retryLoad } = useFaceApi();
  const { videoRef, cameraActive, devices, selectedDeviceId, permissionError, startCamera, stopCamera, switchCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [storedFaces, setStoredFaces] = useState<{ user_id: string; descriptors: Float32Array[] }[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [markedToday, setMarkedToday] = useState<Set<string>>(new Set());
  const [recentlyMarked, setRecentlyMarked] = useState<RecognizedStudent[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classes, setClasses] = useState<{ id: string; class_name: string; section: string | null }[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

  const today = new Date().toISOString().split("T")[0];
  const isStaff = primaryRole === "FOUNDER" || primaryRole === "PRINCIPAL" || primaryRole === "TEACHER";

  useEffect(() => {
    if (!profile?.institution_id || !isStaff) return;
    supabase.from("classes").select("id, class_name, section")
      .eq("institution_id", profile.institution_id)
      .then(({ data }) => setClasses(data || []));
  }, [profile?.institution_id, isStaff]);

  const loadData = useCallback(async () => {
    if (!profile?.institution_id) return;
    const instId = profile.institution_id;

    let studentQuery = supabase.from("students").select("user_id, class_id").eq("institution_id", instId);
    if (selectedClassId) studentQuery = studentQuery.eq("class_id", selectedClassId);
    const { data: students } = await studentQuery;
    if (!students?.length) { setStoredFaces([]); setTotalStudents(0); return; }

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

    // Parse multi-sample descriptors
    const faces = (faceRes.data || []).map(f => {
      const raw = f.face_descriptor as any;
      let descriptors: Float32Array[] = [];
      if (Array.isArray(raw) && raw.length > 0) {
        if (Array.isArray(raw[0])) {
          // Multi-sample: array of arrays
          descriptors = raw.map((d: number[]) => new Float32Array(d));
        } else {
          // Single descriptor (legacy)
          descriptors = [new Float32Array(raw as number[])];
        }
      }
      return { user_id: f.user_id, descriptors };
    }).filter(f => f.descriptors.length > 0);
    setStoredFaces(faces);

    const marked = new Set((attRes.data || []).map(a => a.student_id));
    setMarkedToday(marked);
  }, [profile?.institution_id, selectedClassId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!profile?.institution_id) return;
    const channel = supabase
      .channel("face-attendance-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "attendance",
        filter: `institution_id=eq.${profile.institution_id}`,
      }, (payload) => {
        const newRow = payload.new as any;
        if (newRow.date === today) setMarkedToday(prev => new Set([...prev, newRow.student_id]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.institution_id, today]);

  // Multi-descriptor matching: find best match across all stored descriptors
  const matchFaceMulti = useCallback((
    descriptor: Float32Array,
    threshold = 0.5
  ): { user_id: string; distance: number } | null => {
    let bestMatch: { user_id: string; distance: number } | null = null;
    for (const stored of storedFaces) {
      for (const desc of stored.descriptors) {
        const distance = faceapi.euclideanDistance(Array.from(descriptor), Array.from(desc));
        if (distance < threshold && (!bestMatch || distance < bestMatch.distance)) {
          bestMatch = { user_id: stored.user_id, distance };
        }
      }
    }
    return bestMatch;
  }, [storedFaces]);

  const drawDetectionOverlay = useCallback((detections: any[], matchedIds: Set<string>) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const det of detections) {
      const box = det.detection.box;
      // Find if this detection was matched
      const match = matchFaceMulti(det.descriptor, 0.5);
      const isMatched = match !== null;
      const name = match ? (profileMap[match.user_id] || "Unknown") : "";

      ctx.strokeStyle = isMatched ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      if (isMatched && name) {
        ctx.fillStyle = "hsl(142, 76%, 36%)";
        const textWidth = ctx.measureText(name).width;
        ctx.fillRect(box.x, box.y - 22, textWidth + 12, 22);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(name, box.x + 6, box.y - 6);
      }
    }
  }, [videoRef, matchFaceMulti, profileMap]);

  const markAttendance = async (studentUserId: string) => {
    if (!profile?.institution_id || !user?.id) return;
    const { data: student } = await supabase
      .from("students").select("id, class_id")
      .eq("user_id", studentUserId)
      .eq("institution_id", profile.institution_id).single();
    if (!student) return;

    const { error: insertErr } = await supabase.from("attendance").insert({
      institution_id: profile.institution_id,
      student_id: student.id,
      class_id: student.class_id || selectedClassId || "",
      date: today, status: "Present", marked_by: user.id,
    });

    if (insertErr) {
      if (insertErr.message.includes("duplicate") || insertErr.message.includes("unique")) return;
      console.error("Attendance insert error:", insertErr);
      return;
    }

    setMarkedToday(prev => new Set([...prev, student.id]));
    setRecentlyMarked(prev => [{
      user_id: studentUserId,
      name: profileMap[studentUserId] || "Unknown",
      time: new Date().toLocaleTimeString(),
    }, ...prev]);
  };

  const startScanning = () => {
    if (!videoRef.current || !modelsLoaded || storedFaces.length === 0) return;
    scanningRef.current = true;
    setScanning(true);

    const cooldown = new Set<string>();

    const scanLoop = async () => {
      if (!scanningRef.current || !videoRef.current) return;
      try {
        const results = await detectAllFaces(videoRef.current);
        const matchedIds = new Set<string>();

        for (const result of results) {
          const match = matchFaceMulti(result.descriptor, 0.5);
          if (match) {
            matchedIds.add(match.user_id);
            if (!cooldown.has(match.user_id)) {
              cooldown.add(match.user_id);
              await markAttendance(match.user_id);
              setTimeout(() => cooldown.delete(match.user_id), 15000);
            }
          }
        }

        drawDetectionOverlay(results, matchedIds);
      } catch (err) {
        console.error("Scan error:", err);
      }

      if (scanningRef.current) {
        setTimeout(() => { animFrameRef.current = requestAnimationFrame(scanLoop); }, 800);
      }
    };

    animFrameRef.current = requestAnimationFrame(scanLoop);
  };

  const stopScanning = () => {
    scanningRef.current = false;
    setScanning(false);
    cancelAnimationFrame(animFrameRef.current);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
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
            Auto-detects faces and marks attendance instantly
          </p>
        </div>

        {/* Stats */}
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

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isStaff && classes.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="text-sm font-medium mb-2 block">Filter by Class</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.class_name} {c.section || ""}</option>
                ))}
              </select>
            </div>
          )}
          {devices.length > 1 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <MonitorSpeaker className="w-4 h-4" /> Select Camera
              </label>
              <select
                value={selectedDeviceId}
                onChange={e => switchCamera(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Model loading */}
        {!modelsLoaded && (
          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3">
            {loadError ? (
              <>
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Failed to Load AI Models</p>
                  <p className="text-xs text-muted-foreground">{loadingProgress}</p>
                </div>
                <button onClick={retryLoad} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Loading AI Models</p>
                  <p className="text-xs text-muted-foreground">{loadingProgress}</p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Camera */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative aspect-video bg-muted flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                muted playsInline
              />
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none ${cameraActive && scanning ? "block" : "hidden"}`}
                style={{ objectFit: "cover" }}
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
                  Auto-Detecting...
                </div>
              )}
            </div>

            <div className="p-4 flex flex-wrap gap-3">
              {!cameraActive ? (
                <button
                  onClick={() => startCamera()}
                  disabled={!modelsLoaded}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Start Camera
                </button>
              ) : (
                <>
                  {!scanning ? (
                    <button
                      onClick={startScanning}
                      disabled={storedFaces.length === 0}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <ScanFace className="w-4 h-4" /> Start Auto-Scan
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
                    onClick={() => { stopScanning(); stopCamera(); }}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Stop Camera
                  </button>
                </>
              )}
            </div>

            {storedFaces.length === 0 && modelsLoaded && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  No registered faces found. Register student faces first.
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
                <p className="p-4 text-sm text-muted-foreground text-center">No students marked yet</p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentlyMarked.map((s, i) => (
                    <li key={i} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.time}</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Present</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {(permissionError || error) && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {permissionError || error}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FaceAttendance;
