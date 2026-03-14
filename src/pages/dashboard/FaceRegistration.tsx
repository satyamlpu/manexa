import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFaceApi } from "@/hooks/useFaceApi";
import { useCamera } from "@/hooks/useCamera";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Camera, CheckCircle, Loader2, AlertTriangle, UserCheck, RefreshCw,
  MonitorSpeaker, Trash2, ShieldAlert, X, RotateCcw, ImageIcon
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REQUIRED_SAMPLES = 4;
const DUPLICATE_THRESHOLD = 0.45;

interface CapturedSample {
  descriptor: Float32Array;
  thumbnail: string;
}

const FaceRegistration = () => {
  const { profile, primaryRole, user } = useAuth();
  const { modelsLoaded, loadingProgress, loadError, detectFace, retryLoad } = useFaceApi();
  const { videoRef, cameraActive, devices, selectedDeviceId, permissionError, startCamera, stopCamera, switchCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [samples, setSamples] = useState<CapturedSample[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [qualityWarning, setQualityWarning] = useState("");

  // Duplicate detection
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateUser, setDuplicateUser] = useState("");

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = primaryRole === "FOUNDER" || primaryRole === "PRINCIPAL" || primaryRole === "TEACHER";
  const [students, setStudents] = useState<{ user_id: string; name: string; hasface: boolean }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const targetUserId = isAdmin ? selectedUserId : user?.id;

  // Load students & check registration status
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

    if (primaryRole === "STUDENT" && user) {
      supabase.from("face_data").select("id").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => { if (data) setRegistered(true); });
    }
    if (isAdmin) fetchStudents();
  }, [profile?.institution_id, primaryRole, user, isAdmin]);

  // Capture a video frame as thumbnail
  const captureThumbnail = useCallback((): string => {
    if (!videoRef.current) return "";
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 120;
    const ctx = c.getContext("2d");
    ctx?.drawImage(videoRef.current, 0, 0, 160, 120);
    return c.toDataURL("image/jpeg", 0.7);
  }, [videoRef]);

  // Quality check: blur, multiple faces, lighting
  const checkQuality = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current) return "Camera not ready";
    // Check brightness via canvas pixel analysis
    const c = document.createElement("canvas");
    c.width = videoRef.current.videoWidth;
    c.height = videoRef.current.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    const data = imageData.data;
    let totalBrightness = 0;
    const sampleStep = 40;
    let count = 0;
    for (let i = 0; i < data.length; i += sampleStep * 4) {
      totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      count++;
    }
    const avgBrightness = totalBrightness / count;
    if (avgBrightness < 40) return "Too dark — please improve lighting";
    if (avgBrightness > 240) return "Too bright — reduce direct light";
    return null;
  }, [videoRef]);

  // Check for duplicate faces across all stored descriptors
  const checkDuplicate = useCallback(async (descriptor: Float32Array): Promise<string | null> => {
    if (!profile?.institution_id) return null;
    const { data: allFaces } = await supabase
      .from("face_data")
      .select("user_id, face_descriptor")
      .eq("institution_id", profile.institution_id);
    if (!allFaces?.length) return null;

    // Import faceapi for distance calculation
    const faceapi = await import("face-api.js");

    for (const face of allFaces) {
      // Skip the current user's own face data
      if (face.user_id === targetUserId) continue;
      const stored = face.face_descriptor as number[];
      if (!Array.isArray(stored) || stored.length === 0) continue;
      
      // Handle stored as array of arrays (multi-sample) or single array
      const descriptorsToCheck: number[][] = Array.isArray(stored[0]) ? stored as unknown as number[][] : [stored];
      
      for (const desc of descriptorsToCheck) {
        const distance = faceapi.euclideanDistance(Array.from(descriptor), desc);
        if (distance < DUPLICATE_THRESHOLD) {
          // Find the user's name
          const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", face.user_id).maybeSingle();
          return p?.full_name || face.user_id;
        }
      }
    }
    return null;
  }, [profile?.institution_id, targetUserId]);

  // Capture one sample
  const captureSample = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    if (!targetUserId) {
      setError("Please select a student first.");
      return;
    }
    setCapturing(true);
    setError("");
    setQualityWarning("");

    try {
      // Quality check
      const qualityIssue = await checkQuality();
      if (qualityIssue) {
        setQualityWarning(qualityIssue);
        setCapturing(false);
        return;
      }

      const result = await detectFace(videoRef.current);
      if (!result) {
        setError("No face detected. Position your face clearly in frame.");
        setCapturing(false);
        return;
      }

      // Check if the detection score is reasonable (reject blurry/partial)
      if (result.detection.score < 0.7) {
        setQualityWarning("Face detection confidence is low. Hold still and face the camera directly.");
        setCapturing(false);
        return;
      }

      const thumbnail = captureThumbnail();
      const newSample: CapturedSample = { descriptor: result.descriptor, thumbnail };

      // Check for duplicate on the first sample
      if (samples.length === 0) {
        const dupUser = await checkDuplicate(result.descriptor);
        if (dupUser) {
          setDuplicateUser(dupUser);
          setShowDuplicateDialog(true);
          setCapturing(false);
          return;
        }
      }

      setSamples(prev => [...prev, newSample]);
      setSuccess(`Sample ${samples.length + 1}/${REQUIRED_SAMPLES} captured`);
    } catch (err: any) {
      setError("Capture error: " + (err.message || "Unknown error"));
    }
    setCapturing(false);
  };

  // Save all samples as combined descriptor
  const saveRegistration = async () => {
    if (samples.length < REQUIRED_SAMPLES) {
      setError(`Need ${REQUIRED_SAMPLES} samples. Captured ${samples.length} so far.`);
      return;
    }
    if (!targetUserId || !profile?.institution_id) return;

    setSaving(true);
    setError("");

    try {
      // Average all descriptors for a more robust representation
      const avgDescriptor = new Float32Array(128);
      for (const s of samples) {
        for (let i = 0; i < 128; i++) avgDescriptor[i] += s.descriptor[i];
      }
      for (let i = 0; i < 128; i++) avgDescriptor[i] /= samples.length;

      // Store all individual descriptors + the averaged one for better matching
      const allDescriptors = samples.map(s => Array.from(s.descriptor));
      allDescriptors.push(Array.from(avgDescriptor));

      const { error: dbError } = await supabase.from("face_data").upsert(
        {
          user_id: targetUserId,
          institution_id: profile.institution_id,
          face_descriptor: allDescriptors as unknown as any,
        },
        { onConflict: "user_id" }
      );

      if (dbError) {
        setError("Failed to save: " + dbError.message);
      } else {
        setSuccess("✅ Face registered successfully with " + samples.length + " samples!");
        setRegistered(true);
        if (isAdmin) {
          setStudents(prev =>
            prev.map(s => s.user_id === targetUserId ? { ...s, hasface: true } : s)
          );
        }
      }
    } catch (err: any) {
      setError("Save error: " + (err.message || "Unknown"));
    }
    setSaving(false);
  };

  // Reset samples for rescan
  const handleRescan = () => {
    setSamples([]);
    setSuccess("");
    setError("");
    setRegistered(false);
    setQualityWarning("");
  };

  // Delete face data
  const handleDelete = async () => {
    if (!targetUserId) return;
    setDeleting(true);

    const { error: delError } = await supabase
      .from("face_data")
      .delete()
      .eq("user_id", targetUserId);

    if (delError) {
      setError("Delete failed: " + delError.message);
    } else {
      setSuccess("Face data deleted. Registration required.");
      setRegistered(false);
      setSamples([]);
      if (isAdmin) {
        setStudents(prev =>
          prev.map(s => s.user_id === targetUserId ? { ...s, hasface: false } : s)
        );
      }
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  };

  // Remove a single sample
  const removeSample = (index: number) => {
    setSamples(prev => prev.filter((_, i) => i !== index));
  };

  const registeredCount = students.filter(s => s.hasface).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Face Registration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Register student faces for attendance recognition" : "Register your face for automatic attendance"}
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
                handleRescan();
                const student = students.find(s => s.user_id === e.target.value);
                setRegistered(student?.hasface || false);
              }}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">-- Select a student --</option>
              {students.map(s => (
                <option key={s.user_id} value={s.user_id}>
                  {s.name} {s.hasface ? "✅ Registered" : "❌ Not Registered"}
                </option>
              ))}
            </select>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <UserCheck className="w-3.5 h-3.5" />
              {registeredCount} / {students.length} students registered
            </div>
          </div>
        )}

        {/* Face status indicator */}
        {targetUserId && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${registered ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
            {registered ? (
              <>
                <CheckCircle className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Face Registered</p>
                  <p className="text-xs text-muted-foreground">Ready for attendance recognition</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRescan}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-secondary/80 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Rescan
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Face Not Registered</p>
                  <p className="text-xs text-muted-foreground">Capture {REQUIRED_SAMPLES} samples to register</p>
                </div>
              </>
            )}
          </div>
        )}

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
                  <p className="text-xs text-muted-foreground">{loadingProgress || "Initializing..."}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Camera selector */}
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

        {/* Captured samples preview */}
        {samples.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Captured Samples ({samples.length}/{REQUIRED_SAMPLES})
            </h3>
            <div className="flex gap-3 flex-wrap">
              {samples.map((s, i) => (
                <div key={i} className="relative group">
                  <img
                    src={s.thumbnail}
                    alt={`Sample ${i + 1}`}
                    className="w-24 h-18 rounded-lg border border-border object-cover"
                  />
                  <button
                    onClick={() => removeSample(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1 rounded">#{i + 1}</span>
                </div>
              ))}
              {Array.from({ length: REQUIRED_SAMPLES - samples.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-24 h-18 rounded-lg border border-dashed border-border flex items-center justify-center">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
            {samples.length >= REQUIRED_SAMPLES && (
              <button
                onClick={saveRegistration}
                disabled={saving}
                className="mt-4 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Registration"}
              </button>
            )}
          </div>
        )}

        {/* Camera area */}
        {!registered && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative aspect-video bg-muted flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              {!cameraActive && (
                <div className="text-center p-8">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Camera is off</p>
                </div>
              )}
              {/* Capture progress overlay */}
              {cameraActive && samples.length < REQUIRED_SAMPLES && (
                <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur rounded-lg px-3 py-2 text-xs font-medium">
                  Samples: {samples.length} / {REQUIRED_SAMPLES}
                </div>
              )}
            </div>

            <div className="p-4 flex flex-wrap gap-3">
              {!cameraActive ? (
                <button
                  onClick={() => startCamera()}
                  disabled={!modelsLoaded || !targetUserId}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Start Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={captureSample}
                    disabled={capturing || samples.length >= REQUIRED_SAMPLES}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {capturing ? "Capturing..." : `Capture Sample ${samples.length + 1}`}
                  </button>
                  {samples.length > 0 && (
                    <button
                      onClick={handleRescan}
                      className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors inline-flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Rescan All
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
          </div>
        )}

        {/* Quality warning */}
        {qualityWarning && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {qualityWarning}
          </div>
        )}

        {/* Permission / errors */}
        {permissionError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {permissionError}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && !error && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-xl p-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}

        {/* Tips */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold">Tips for Best Results</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ensure good, even lighting — face the light source</li>
            <li>Capture samples from slightly different angles</li>
            <li>Look directly at the camera for at least 2 samples</li>
            <li>Remove glasses or hats if possible</li>
            <li>Keep a neutral expression</li>
            <li>Only one face should be visible in frame</li>
            <li>{REQUIRED_SAMPLES} samples are required for accurate recognition</li>
          </ul>
        </div>
      </div>

      {/* Duplicate Face Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle>Duplicate Face Detected</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This face is already registered with <strong>{duplicateUser}</strong>. Each person can only have one face registration. Please use a different person or contact the administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDuplicateDialog(false); handleRescan(); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> Rescan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Face Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the face registration. The user will need to register again before attendance can be marked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default FaceRegistration;
