import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

const ManageAttendance = () => {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile?.institution_id) return;
    supabase.from("classes").select("id, class_name, section").eq("institution_id", profile.institution_id).then(({ data }) => setClasses(data || []));
  }, [profile?.institution_id]);

  useEffect(() => {
    if (!selectedClass || !profile?.institution_id) return;
    supabase.from("students").select("id, roll_number, user_id, profiles:user_id(full_name)").eq("institution_id", profile.institution_id).eq("class_id", selectedClass)
      .then(({ data }) => {
        setStudents(data || []);
        const initial: Record<string, string> = {};
        (data || []).forEach((s: any) => { initial[s.id] = "Present"; });
        setAttendance(initial);
      });
  }, [selectedClass, profile?.institution_id]);

  const handleSave = async () => {
    if (!user || !profile?.institution_id) return;
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
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mark Attendance</h1>
        <div className="flex gap-3 flex-wrap">
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm min-w-[200px]">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.section || ""}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>

        {selectedClass && students.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roll #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3">{s.roll_number || "—"}</td>
                    <td className="px-4 py-3">{s.profiles?.full_name || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={attendance[s.id] || "Present"}
                        onChange={e => setAttendance({ ...attendance, [s.id]: e.target.value })}
                        className="h-8 rounded border border-input bg-background px-2 text-sm"
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-border flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving..." : "Save Attendance"}
              </button>
              {saved && <span className="text-sm text-primary">✓ Saved!</span>}
            </div>
          </div>
        )}

        {selectedClass && students.length === 0 && (
          <p className="text-muted-foreground text-sm">No students in this class.</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageAttendance;
