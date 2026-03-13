import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import CSVImport from "@/components/CSVImport";
import { Plus, X, Upload } from "lucide-react";

const ManageStudents = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", class_id: "", roll_number: "", guardian_name: "", guardian_phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCSV, setShowCSV] = useState(false);

  const fetchData = async () => {
    if (!profile?.institution_id) return;
    const [sRes, cRes] = await Promise.all([
      supabase.from("students").select("id, roll_number, guardian_name, class_id, user_id").eq("institution_id", profile.institution_id),
      supabase.from("classes").select("id, class_name, section").eq("institution_id", profile.institution_id),
    ]);
    
    const studentData = sRes.data || [];
    const classData = cRes.data || [];
    
    // Fetch profiles separately
    const userIds = studentData.map(s => s.user_id);
    const classIds = studentData.map(s => s.class_id).filter(Boolean);
    
    const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds) : { data: [] };
    
    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => { profileMap[p.user_id] = p; });
    const classMap: Record<string, any> = {};
    classData.forEach(c => { classMap[c.id] = c; });
    
    setStudents(studentData.map(s => ({ ...s, profiles: profileMap[s.user_id] || null, classes: s.class_id ? classMap[s.class_id] || null : null })));
    setClasses(classData);
  };

  useEffect(() => { fetchData(); }, [profile?.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await supabase.functions.invoke("create-user", {
      body: { ...form, role: "STUDENT" },
    });
    if (res.error || !res.data?.success) {
      setError(res.data?.message || "Failed");
    } else {
      setShowForm(false);
      setForm({ full_name: "", email: "", password: "", class_id: "", roll_number: "", guardian_name: "", guardian_phone: "" });
      fetchData();
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Students</h1>
          <div className="flex gap-2">
            <button onClick={() => { setShowCSV(!showCSV); setShowForm(false); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              {showCSV ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {showCSV ? "Close CSV" : "Upload CSV"}
            </button>
            <button onClick={() => { setShowForm(!showForm); setShowCSV(false); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "Add Student"}
            </button>
          </div>
        </div>

        {showCSV && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Bulk Import Students via CSV</h2>
            <CSVImport type="student" onComplete={fetchData} />
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-3">
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-2">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required minLength={6} />
              <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.section}</option>)}
              </select>
              <input placeholder="Roll Number" value={form.roll_number} onChange={e => setForm({ ...form, roll_number: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              <input placeholder="Guardian Name" value={form.guardian_name} onChange={e => setForm({ ...form, guardian_name: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              <input placeholder="Guardian Phone" value={form.guardian_phone} onChange={e => setForm({ ...form, guardian_phone: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {loading ? "Creating..." : "Create Student"}
            </button>
          </form>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roll #</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guardian</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No students yet</td></tr>
              ) : (
                students.map((s: any) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3">{s.profiles?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.profiles?.email || "—"}</td>
                    <td className="px-4 py-3">{s.classes ? `${s.classes.class_name} ${s.classes.section || ""}` : "—"}</td>
                    <td className="px-4 py-3">{s.roll_number || "—"}</td>
                    <td className="px-4 py-3">{s.guardian_name || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageStudents;
