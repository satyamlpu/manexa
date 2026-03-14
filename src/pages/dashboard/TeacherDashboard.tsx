import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, ListTodo, ClipboardCheck, GraduationCap, RefreshCw, Users } from "lucide-react";

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ classes: 0, totalStudents: 0, pendingTasks: 0, todayPresent: 0, todayTotal: 0 });
  const [realtimePresent, setRealtimePresent] = useState<string[]>([]);
  const [todayStudents, setTodayStudents] = useState<{ name: string; time: string; status: string }[]>([]);

  useEffect(() => {
    if (!user || !profile?.institution_id) return;
    const instId = profile.institution_id!;

    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const [c, t, students, attendance] = await Promise.all([
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("class_teacher_id", user.id),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("assigned_by", user.id).eq("status", "pending"),
        supabase.from("students").select("id, user_id", { count: "exact" }).eq("institution_id", instId),
        supabase.from("attendance").select("student_id, status, created_at").eq("institution_id", instId).eq("date", today),
      ]);

      const presentToday = attendance.data?.filter(a => a.status === "Present").length || 0;

      // Get student names for today's attendance
      const presentStudentIds = attendance.data?.filter(a => a.status === "Present").map(a => a.student_id) || [];
      let todayList: { name: string; time: string; status: string }[] = [];

      if (presentStudentIds.length > 0) {
        const { data: studentProfiles } = await supabase
          .from("students")
          .select("id, user_id")
          .eq("institution_id", instId)
          .in("id", presentStudentIds);

        if (studentProfiles) {
          const userIds = studentProfiles.map(s => s.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds);

          todayList = attendance.data?.filter(a => a.status === "Present").map(a => {
            const stu = studentProfiles.find(s => s.id === a.student_id);
            const prof = profiles?.find(p => p.user_id === stu?.user_id);
            return {
              name: prof?.full_name || "Unknown",
              time: new Date(a.created_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }),
              status: "Present",
            };
          }) || [];
        }
      }

      setTodayStudents(todayList);
      setStats({
        classes: c.count || 0,
        totalStudents: students.count || 0,
        pendingTasks: t.count || 0,
        todayPresent: presentToday,
        todayTotal: attendance.data?.length || 0,
      });
      setLoading(false);
    };

    load();

    // Real-time
    const channel = supabase
      .channel("teacher-attendance")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance" }, (payload) => {
        const rec = payload.new as any;
        if (rec.institution_id === instId && rec.status === "Present") {
          setRealtimePresent(prev => [...prev, rec.student_id]);
          setStats(prev => ({ ...prev, todayPresent: prev.todayPresent + 1, todayTotal: prev.todayTotal + 1 }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, profile?.institution_id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your classes and attendance overview</p>
        </div>

        {/* Real-time indicator */}
        {realtimePresent.length > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">{realtimePresent.length} new attendance(s) just now</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <BookOpen className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">My Classes</p>
            <p className="text-2xl font-bold">{stats.classes}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <GraduationCap className="w-5 h-5 text-accent mb-2" />
            <p className="text-xs text-muted-foreground">Total Students</p>
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <ClipboardCheck className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Present Today</p>
            <p className="text-2xl font-bold">{stats.todayPresent}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <ListTodo className="w-5 h-5 text-secondary mb-2" />
            <p className="text-xs text-muted-foreground">Pending Tasks</p>
            <p className="text-2xl font-bold">{stats.pendingTasks}</p>
          </div>
        </div>

        {/* Today's Present Students */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Today's Present Students</h3>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">{todayStudents.length}</span>
          </div>
          {todayStudents.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayStudents.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{s.time}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No attendance marked yet today</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
