import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ClipboardCheck, ListTodo, Megaphone } from "lucide-react";

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ attendanceRate: 0, pendingTasks: 0, announcements: 0 });

  useEffect(() => {
    if (!user || !profile?.institution_id) return;
    const fetch = async () => {
      const instId = profile.institution_id!;
      const [att, tasks, ann] = await Promise.all([
        supabase.from("attendance").select("status").eq("institution_id", instId).eq("student_id", user.id),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("assigned_to", user.id).eq("status", "pending"),
        supabase.from("announcements").select("id", { count: "exact", head: true }).eq("institution_id", instId),
      ]);
      const present = att.data?.filter(a => a.status === "Present").length || 0;
      const total = att.data?.length || 0;
      setStats({
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        pendingTasks: tasks.count || 0,
        announcements: ann.count || 0,
      });
    };
    fetch();
  }, [user, profile?.institution_id]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <ClipboardCheck className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Attendance Rate</p>
            <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <ListTodo className="w-5 h-5 text-secondary mb-2" />
            <p className="text-xs text-muted-foreground">Pending Tasks</p>
            <p className="text-2xl font-bold">{stats.pendingTasks}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <Megaphone className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Announcements</p>
            <p className="text-2xl font-bold">{stats.announcements}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
