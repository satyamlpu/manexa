import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Download, CheckCircle, XCircle, Clock, Users, Check } from "lucide-react";
import { exportAttendancePDF } from "@/lib/pdfExport";

const ManageAttendance = () => {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile?.institution_id) return;
    supabase.from("classes").select("id, class_name, section").eq("institution_id", profile.institution_id).then(({ data }) => setClasses(data || []));
  }, [profile?.institution_id]);

  useEffect(() => {
    if (!selectedClass || !profile?.institution_id) return;

    const loadStudentsAndAttendance = async () => {
      const { data: stuData } = await supabase
        .from("students")
        .select("id, roll_number, user_id, profiles:user_id(full_name)")
        .eq("institution_id", profile.institution_id!)
        .eq("class_id", selectedClass);

      const studentList = stuData || [];
      setStudents(studentList);

      // Load existing attendance for this date
      const { data: attData } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("institution_id", profile.institution_id!)
        .eq("class_id", selectedClass)
        .eq("date", date);

      const existing: Record<string, string> = {};
      const current: Record<string, string> = {};
      (attData || []).forEach((a: any) => {
        existing[a.student_id] = a.status;
        current[a.student_id] = a.status;
      });

      // For students without existing attendance, default to empty (not marked)
      studentList.forEach((s: any) => {
        if (!current[s.id]) current[s.id] = "";
      });

      setExistingAttendance(existing);
      setAttendance(current);
    };

    loadStudentsAndAttendance();
  }, [selectedClass, date, profile?.institution_id]);

  const markAllPresent = () => {
    const updated: Record<string, string> = {};
    students.forEach((s: any) => { updated[s.id] = "Present"; });
    setAttendance(updated);
  };

  const markAllAbsent = () => {
    const updated: Record<string, string> = {};
    students.forEach((s: any) => { updated[s.id] = "Absent"; });
    setAttendance(updated);
  };

  const handleSave = async () => {
    if (!user || !profile?.institution_id) return;
    const unmarked = students.filter((s: any) => !attendance[s.id]);
    if (unmarked.length > 0) {
      alert(`Please mark attendance for all students. ${unmarked.length} student(s) not marked.`);
      return;
    }
    setSaving(true);
    const records = Object.entries(attendance).map(([studentId, status]) => ({
      institution_id: profile.institution_id!,
      student_id: studentId,
      class_id: selectedClass,
      date,
      status,
      marked_by: user.id,
    }));
    await supabase.from("attendance").upsert(records, { onConflict: "student_id,date" });
    setExistingAttendance({ ...attendance });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const presentCount = Object.values(attendance).filter(s => s === "Present").length;
  const absentCount = Object.values(attendance).filter(s => s === "Absent").length;
  const lateCount = Object.values(attendance).filter(s => s === "Late").length;
  const unmarkedCount = Object.values(attendance).filter(s => !s).length;
  const isAlreadySaved = Object.keys(existingAttendance).length > 0;

  const statusColor = (status: string) => {
    switch (status) {
      case "Present": return "bg-primary/10 text-primary border-primary/30";
      case "Absent": return "bg-destructive/10 text-destructive border-destructive/30";
      case "Late": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const presentStudents = students.filter((s: any) => attendance[s.id] === "Present");
  const absentStudents = students.filter((s: any) => attendance[s.id] === "Absent");
  const lateStudents = students.filter((s: any) => attendance[s.id] === "Late");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
          <p className="text-sm text-muted-foreground">Select a class and date, then mark each student</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm min-w-[200px]">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.section || ""}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>

        {selectedClass && students.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><Users className="w-4 h-4 text-muted-foreground" /></div>
                <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{students.length}</p></div>
              </div>
              <div className="bg-card border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><CheckCircle className="w-4 h-4 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Present</p><p className="text-xl font-bold text-primary">{presentCount}</p></div>
              </div>
              <div className="bg-card border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="w-4 h-4 text-destructive" /></div>
                <div><p className="text-xs text-muted-foreground">Absent</p><p className="text-xl font-bold text-destructive">{absentCount}</p></div>
              </div>
              <div className="bg-card border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="w-4 h-4 text-yellow-500" /></div>
                <div><p className="text-xs text-muted-foreground">Late</p><p className="text-xl font-bold text-yellow-500">{lateCount}</p></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={markAllPresent}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                <Check className="w-3.5 h-3.5" /> Mark All Present
              </button>
              <button onClick={markAllAbsent}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Mark All Absent
              </button>
              {isAlreadySaved && (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Attendance already saved for this date
                </span>
              )}
            </div>

            {/* Student Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roll #</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any, idx: number) => (
                    <tr key={s.id} className={`border-t border-border ${attendance[s.id] === "Absent" ? "bg-destructive/5" : attendance[s.id] === "Present" ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.roll_number || "—"}</td>
                      <td className="px-4 py-3 font-medium">{s.profiles?.full_name || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {["Present", "Absent", "Late"].map(status => (
                            <button key={status} onClick={() => setAttendance({ ...attendance, [s.id]: status })}
                              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                attendance[s.id] === status ? statusColor(status) : "border-border text-muted-foreground hover:border-foreground/30"
                              }`}>
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-4 border-t border-border flex items-center gap-3 flex-wrap">
                <button onClick={handleSave} disabled={saving || unmarkedCount > 0}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
                {unmarkedCount > 0 && (
                  <span className="text-xs text-muted-foreground">{unmarkedCount} student(s) not yet marked</span>
                )}
                {saved && <span className="text-sm text-primary font-medium">✓ Attendance saved successfully!</span>}
                <button
                  onClick={() => {
                    const cls = classes.find(c => c.id === selectedClass);
                    exportAttendancePDF(
                      `${cls?.class_name || ""} ${cls?.section || ""}`.trim(),
                      date,
                      students.map((s: any) => ({ rollNumber: s.roll_number || "", name: s.profiles?.full_name || "—", status: attendance[s.id] || "Not Marked" }))
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors ml-auto"
                >
                  <Download className="w-4 h-4" /> Export PDF
                </button>
              </div>
            </div>

            {/* Present / Absent / Late Lists */}
            {Object.keys(existingAttendance).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Present */}
                <div className="bg-card border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Present ({presentStudents.length})</h3>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {presentStudents.length > 0 ? presentStudents.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>{s.profiles?.full_name || "—"}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{s.roll_number}</span>
                      </div>
                    )) : <p className="text-xs text-muted-foreground">None</p>}
                  </div>
                </div>

                {/* Absent */}
                <div className="bg-card border border-destructive/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <h3 className="text-sm font-semibold">Absent ({absentStudents.length})</h3>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {absentStudents.length > 0 ? absentStudents.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                        <span>{s.profiles?.full_name || "—"}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{s.roll_number}</span>
                      </div>
                    )) : <p className="text-xs text-muted-foreground">None</p>}
                  </div>
                </div>

                {/* Late */}
                <div className="bg-card border border-yellow-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <h3 className="text-sm font-semibold">Late ({lateStudents.length})</h3>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {lateStudents.length > 0 ? lateStudents.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                        <span>{s.profiles?.full_name || "—"}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{s.roll_number}</span>
                      </div>
                    )) : <p className="text-xs text-muted-foreground">None</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {selectedClass && students.length === 0 && (
          <p className="text-muted-foreground text-sm">No students in this class.</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageAttendance;
