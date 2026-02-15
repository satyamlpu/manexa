import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, X } from "lucide-react";

const ManageClasses = () => {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ class_name: "", section: "", class_teacher_id: "" });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!profile?.institution_id) return;
    const [c, t] = await Promise.all([
      supabase.from("classes").select("id, class_name, section, class_teacher_id, profiles:class_teacher_id(full_name)").eq("institution_id", profile.institution_id),
      supabase.from("teachers").select("user_id, profiles:user_id(full_name)").eq("institution_id", profile.institution_id),
    ]);
    setClasses(c.data || []);
    setTeachers(t.data || []);
  };

  useEffect(() => { fetchData(); }, [profile?.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from("classes").insert({
      institution_id: profile!.institution_id!,
      class_name: form.class_name,
      section: form.section || null,
      class_teacher_id: form.class_teacher_id || null,
    });
    setShowForm(false);
    setForm({ class_name: "", section: "", class_teacher_id: "" });
    fetchData();
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Classes</h1>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Add Class"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input placeholder="Class Name (e.g. 10th)" value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input placeholder="Section (e.g. A)" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              <select value={form.class_teacher_id} onChange={e => setForm({ ...form, class_teacher_id: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Assign Teacher</option>
                {teachers.map((t: any) => <option key={t.user_id} value={t.user_id}>{t.profiles?.full_name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {loading ? "Creating..." : "Create Class"}
            </button>
          </form>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Section</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class Teacher</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No classes yet</td></tr>
              ) : (
                classes.map((c: any) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">{c.class_name}</td>
                    <td className="px-4 py-3">{c.section || "—"}</td>
                    <td className="px-4 py-3">{c.profiles?.full_name || "Unassigned"}</td>
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

export default ManageClasses;
