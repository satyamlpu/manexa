import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, X } from "lucide-react";

const ManageTasks = () => {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "" });
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    if (!profile?.institution_id) return;
    const { data } = await supabase.from("tasks").select("*, assigner:assigned_by(full_name), assignee:assigned_to(full_name)").eq("institution_id", profile.institution_id).order("created_at", { ascending: false });
    setTasks(data || []);
  };

  useEffect(() => { fetchTasks(); }, [profile?.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.institution_id) return;
    setLoading(true);
    await supabase.from("tasks").insert({
      institution_id: profile.institution_id,
      assigned_by: user.id,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
    });
    setShowForm(false);
    setForm({ title: "", description: "", due_date: "" });
    fetchTasks();
    setLoading(false);
  };

  const updateStatus = async (taskId: string, status: string) => {
    await supabase.from("tasks").update({ status }).eq("id", taskId);
    fetchTasks();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New Task"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <input placeholder="Task Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {loading ? "Creating..." : "Create Task"}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks yet.</p>
          ) : (
            tasks.map((t: any) => (
              <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium">{t.title}</h3>
                  {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {t.due_date && <span>Due: {t.due_date}</span>}
                  </div>
                </div>
                <select
                  value={t.status}
                  onChange={e => updateStatus(t.id, e.target.value)}
                  className={`h-8 rounded border border-input bg-background px-2 text-xs ${t.status === "completed" ? "text-primary" : ""}`}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageTasks;
