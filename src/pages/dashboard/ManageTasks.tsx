import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, X, ListTodo, Clock, CheckCircle, AlertTriangle, Flag } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TaskForm {
  title: string;
  description: string;
  due_date: string;
  assigned_to: string;
  priority: string;
}

const ManageTasks = () => {
  const { user, profile, primaryRole } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TaskForm>({ title: "", description: "", due_date: "", assigned_to: "", priority: "Medium" });
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("all");

  const canAssign = ["FOUNDER", "PRINCIPAL"].includes(primaryRole || "");

  const fetchTasks = async () => {
    if (!profile?.institution_id) return;
    const instId = profile.institution_id!;

    let query = supabase.from("tasks").select("*").eq("institution_id", instId).order("created_at", { ascending: false });

    // Non-admin roles only see their assigned tasks
    if (!canAssign && user) {
      query = query.eq("assigned_to", user.id);
    }

    const { data } = await query;
    setTasks(data || []);

    // Fetch profiles for all relevant user IDs
    const userIds = new Set<string>();
    (data || []).forEach((t: any) => {
      if (t.assigned_by) userIds.add(t.assigned_by);
      if (t.assigned_to) userIds.add(t.assigned_to);
    });

    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(userIds));
      const map: Record<string, string> = {};
      (profiles || []).forEach(p => { map[p.user_id] = p.full_name; });
      setProfilesMap(map);
    }
  };

  const fetchAssignees = async () => {
    if (!profile?.institution_id || !canAssign) return;
    const instId = profile.institution_id!;

    // Get teachers
    const { data: teacherData } = await supabase
      .from("teachers")
      .select("user_id")
      .eq("institution_id", instId);

    const teacherUserIds = (teacherData || []).map(t => t.user_id);

    // Get staff roles
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("institution_id", instId)
      .eq("role", "STAFF");

    const staffUserIds = (staffRoles || []).map(s => s.user_id);

    const allUserIds = [...new Set([...teacherUserIds, ...staffUserIds])];

    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", allUserIds);

      setTeachers((profiles || []).filter(p => teacherUserIds.includes(p.user_id)));
      setStaffMembers((profiles || []).filter(p => staffUserIds.includes(p.user_id)));
    }
  };

  useEffect(() => { fetchTasks(); fetchAssignees(); }, [profile?.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.institution_id) return;
    if (!form.title.trim()) {
      toast({ title: "Task title is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("tasks").insert({
      institution_id: profile.institution_id,
      assigned_by: user.id,
      assigned_to: form.assigned_to || null,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      status: "pending",
    });
    if (error) {
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task created successfully" });
      setShowForm(false);
      setForm({ title: "", description: "", due_date: "", assigned_to: "", priority: "Medium" });
      fetchTasks();
    }
    setLoading(false);
  };

  const updateStatus = async (taskId: string, status: string) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      toast({ title: `Task marked as ${status.replace("_", " ")}` });
    }
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast({ title: "Task deleted" });
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
  const pendingCount = tasks.filter(t => t.status === "pending").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
  const completedCount = tasks.filter(t => t.status === "completed").length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "in_progress": return "bg-primary/10 text-primary border-primary/30";
      case "completed": return "bg-green-500/10 text-green-500 border-green-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Task Management</h1>
            <p className="text-sm text-muted-foreground">
              {canAssign ? "Assign and track tasks for teachers and staff" : "Your assigned tasks"}
            </p>
          </div>
          {canAssign && (
            <button onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "Assign Task"}
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="w-4 h-4 text-yellow-500" /></div>
            <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{pendingCount}</p></div>
          </div>
          <div className="bg-card border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Clock className="w-4 h-4 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">In Progress</p><p className="text-xl font-bold">{inProgressCount}</p></div>
          </div>
          <div className="bg-card border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="w-4 h-4 text-green-500" /></div>
            <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold">{completedCount}</p></div>
          </div>
        </div>

        {/* Create Task Form */}
        {showForm && canAssign && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ListTodo className="w-4 h-4 text-primary" /> Assign New Task</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Task Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Assign to (optional)</option>
                {teachers.length > 0 && (
                  <optgroup label="Teachers">
                    {teachers.map(t => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
                  </optgroup>
                )}
                {staffMembers.length > 0 && (
                  <optgroup label="Staff">
                    {staffMembers.map(s => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
                  </optgroup>
                )}
              </select>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>
            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
            <button type="submit" disabled={loading}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {loading ? "Creating..." : "Create & Assign Task"}
            </button>
          </form>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "in_progress", label: "In Progress" },
            { key: "completed", label: "Completed" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <ListTodo className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No tasks found</p>
            </div>
          ) : (
            filtered.map((t: any) => (
              <div key={t.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{t.title}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(t.status)}`}>
                        {t.status?.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {t.assigned_to && <span>👤 {profilesMap[t.assigned_to] || "Unknown"}</span>}
                      {t.assigned_by && <span>📝 By: {profilesMap[t.assigned_by] || "Unknown"}</span>}
                      {t.due_date && <span>📅 Due: {new Date(t.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={t.status || "pending"} onChange={e => updateStatus(t.id, e.target.value)}
                      className="h-8 rounded border border-input bg-background px-2 text-xs">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    {canAssign && (
                      <button onClick={() => deleteTask(t.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageTasks;
