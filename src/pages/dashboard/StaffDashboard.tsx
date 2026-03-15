import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ListTodo, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const StaffDashboard = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !profile?.institution_id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("institution_id", profile.institution_id!)
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });
      setTasks(data || []);
      setLoading(false);
    };
    load();
  }, [user, profile?.institution_id]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("tasks").update({ status }).eq("id", taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const pendingTasks = tasks.filter(t => t.status === "pending");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Staff Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your assigned tasks and operations</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mb-2" />
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{pendingTasks.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <Clock className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold">{inProgressTasks.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <CheckCircle className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{completedTasks.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">My Tasks</h3>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                    {task.due_date && <p className="text-xs text-muted-foreground mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</p>}
                  </div>
                  <select
                    value={task.status || "pending"}
                    onChange={e => updateTaskStatus(task.id, e.target.value)}
                    className="h-8 rounded border border-input bg-background px-2 text-xs flex-shrink-0"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned yet</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
