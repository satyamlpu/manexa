import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFaceApi } from "@/hooks/useFaceApi";
import DashboardLayout from "@/components/DashboardLayout";
import { Camera, CheckCircle, Loader2, AlertTriangle, UserCheck, RefreshCw } from "lucide-react";

const FaceRegistration = () => {
  const { profile, primaryRole, user } = useAuth();
  const { modelsLoaded, loadingProgress, detectFace } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // For admin: select a student to register
  const isAdmin = primaryRole === "FOUNDER" || primaryRole === "PRINCIPAL" || primaryRole === "TEACHER";
  const [students, setStudents] = useState<{ user_id: string; name: string; hasface: boolean }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    if (!profile?.institution_id) return;

    const fetchStudents = async () => {
      const { data: studs } = await supabase
        .from("students")
        .select("user_id")
        .eq("institution_id", profile.institution_id!);

      if (!studs?.length) return;
      const userIds = studs.map(s => s.user_id);

      const [profilesRes, faceRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
        supabase.from("face_data").select("user_id").in("user_id", userIds),
      ]);

      const faceSet = new Set(faceRes.data?.map(f => f.user_id) || []);
      const profileMap: Record<string, string> = {};
      profilesRes.data?.forEach(p => { profileMap[p.user_id] = p.full_name; });

      setStudents(
        studs.map(s => ({
          user_id: s.user_id,
          name: profileMap[s.user_id] || "Unknown",
          hasface: faceSet.has(s.user_id),
        }))
      );
    };

    // Check if current user already registered (student self-registration)
    if (primaryRole === "STUDENT" && user) {
      supabase
        .from("face_data")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setRegistered(true);
        });
    }

    if (isAdmin) fetchStudents();
  }, [profile?.institution_id, primaryRole, user]);

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
      setError("Unable to access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const captureAndRegister = async () => {
    if (!videoRef.current || !modelsLoaded) return;

    const targetUserId = isAdmin ? selectedUserId : user?.id;
    if (!targetUserId) {
      setError("Please select a student first.");
      return;
    }

    setCapturing(true);
    setError("");
    setSuccess("");

    try {
      const result = await detectFace(videoRef.current);
      if (!result) {
        setError("No face detected. Please position your face in the center and try again.");
        setCapturing(false);
        return;
      }

      const descriptorArray = Array.from(result.descriptor);

      // Upsert face data
      const { error: dbError } = await supabase.from("face_data").upsert(
        {
          user_id: targetUserId,
          institution_id: profile!.institution_id!,
          face_descriptor: descriptorArray,
        },
        { onConflict: "user_id" }
      );

      if (dbError) {
        setError("Failed to save face data: " + dbError.message);
      } else {
        setSuccess("Face registered successfully!");
        setRegistered(true);

        // Update student list
        if (isAdmin) {
          setStudents(prev =>
            prev.map(s => (s.user_id === targetUserId ? { ...s, hasface: true } : s))
          );
        }

        // Draw snapshot on canvas
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          ctx?.drawImage(videoRef.current, 0, 0);
        }
      }
    } catch (err: any) {
      setError("Error during capture: " + (err.message || "Unknown error"));
    }

    setCapturing(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Face Registration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Register student faces for attendance recognition"
              : "Register your face for automatic attendance"}
          </p>
        </div>

        {/* Admin student selector */}
        {isAdmin && (
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-sm font-medium mb-2 block">Select Student</label>
            <select
              value={selectedUserId}
              onChange={e => {
                setSelectedUserId(e.target.value);
                setSuccess("");
                setRegistered(false);
              }}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">-- Select a student --</option>
              {students.map(s => (
                <option key={s.user_id} value={s.user_id}>
                  {s.name} {s.hasface ? "✅ (Registered)" : ""}
                </option>
              ))}
            </select>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <UserCheck className="w-3.5 h-3.5" />
              {students.filter(s => s.hasface).length} / {students.length} students registered
            </div>
          </div>
        )}

        {/* Model loading status */}
        {!modelsLoaded && (
          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">Loading AI Models</p>
              <p className="text-xs text-muted-foreground">{loadingProgress || "Initializing..."}</p>
            </div>
          </div>
        )}

        {/* Camera area */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="relative aspect-video bg-muted flex items-center justify-center">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className={`w-full h-full object-cover ${!cameraActive && registered ? "block" : "hidden"}`}
            />
            {!cameraActive && !registered && (
              <div className="text-center p-8">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Camera is off</p>
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
                <button
                  onClick={captureAndRegister}
                  disabled={capturing || (!isAdmin && registered)}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {capturing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {capturing ? "Capturing..." : "Capture & Register"}
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Stop Camera
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-xl p-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Tips */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold">Tips for Best Results</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ensure good lighting — face the light source</li>
            <li>Look directly at the camera</li>
            <li>Remove glasses or hats if possible</li>
            <li>Keep a neutral expression</li>
            <li>Only one face should be visible</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FaceRegistration;
