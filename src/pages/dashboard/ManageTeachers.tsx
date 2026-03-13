import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import CSVImport from "@/components/CSVImport";
import { Plus, X, Upload } from "lucide-react";

interface TeacherRow {
  id: string;
  department: string | null;
  qualification: string | null;
  user_id: string;
  profiles?: { full_name: string; email: string } | null;
}

const ManageTeachers = () => {
  const { profile } = useAuth();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", department: "", qualification: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCSV, setShowCSV] = useState(false);

  const fetchTeachers = async () => {
    if (!profile?.institution_id) return;
    const { data: teacherData } = await supabase
      .from("teachers")
      .select("id, department, qualification, user_id")
      .eq("institution_id", profile.institution_id);
    
    if (!teacherData?.length) { setTeachers([]); return; }
    
    const userIds = teacherData.map(t => t.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);
    
    const profileMap: Record<string, { full_name: string; email: string }> = {};
    profiles?.forEach(p => { profileMap[p.user_id] = p; });
    
    setTeachers(teacherData.map(t => ({ ...t, profiles: profileMap[t.user_id] || null })));
  };

  useEffect(() => { fetchTeachers(); }, [profile?.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await supabase.functions.invoke("create-user", {
      body: { ...form, role: "TEACHER" },
    });
    if (res.error || !res.data?.success) {
      setError(res.data?.message || res.error?.message || "Failed to create teacher");
    } else {
      setShowForm(false);
      setForm({ full_name: "", email: "", password: "", department: "", qualification: "" });
      fetchTeachers();
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Teachers</h1>
          <div className="flex gap-2">
            <button onClick={() => { setShowCSV(!showCSV); setShowForm(false); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              {showCSV ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {showCSV ? "Close CSV" : "Upload CSV"}
            </button>
            <button onClick={() => { setShowForm(!showForm); setShowCSV(false); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "Add Teacher"}
            </button>
          </div>
        </div>

        {showCSV && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Bulk Import Teachers via CSV</h2>
            <CSVImport type="teacher" onComplete={fetchTeachers} />
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-3">
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-2">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required minLength={6} />
              <input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              <input placeholder="Qualification" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {loading ? "Creating..." : "Create Teacher"}
            </button>
          </form>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Qualification</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No teachers yet</td></tr>
              ) : (
                teachers.map(t => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3">{(t.profiles as any)?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{(t.profiles as any)?.email || "—"}</td>
                    <td className="px-4 py-3">{t.department || "—"}</td>
                    <td className="px-4 py-3">{t.qualification || "—"}</td>
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

export default ManageTeachers;
