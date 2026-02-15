import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, ListTodo, ClipboardCheck } from "lucide-react";

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ classes: 0, pendingTasks: 0, todayAttendance: 0 });

  useEffect(() => {
    if (!user || !profile?.institution_id) return;
    const fetch = async () => {
      const instId = profile.institution_id!;
      const [c, t] = await Promise.all([
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("class_teacher_id", user.id),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("assigned_by", user.id).eq("status", "pending"),
      ]);
      setStats({ classes: c.count || 0, pendingTasks: t.count || 0, todayAttendance: 0 });
    };
    fetch();
  }, [user, profile?.institution_id]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <BookOpen className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">My Classes</p>
            <p className="text-2xl font-bold">{stats.classes}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <ListTodo className="w-5 h-5 text-secondary mb-2" />
            <p className="text-xs text-muted-foreground">Pending Tasks</p>
            <p className="text-2xl font-bold">{stats.pendingTasks}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <ClipboardCheck className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Today's Attendance</p>
            <p className="text-2xl font-bold">{stats.todayAttendance}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
