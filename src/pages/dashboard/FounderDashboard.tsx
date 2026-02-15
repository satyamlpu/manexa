import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, GraduationCap, BookOpen, ClipboardCheck, ListTodo } from "lucide-react";

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayAttendanceRate: number;
  pendingTasks: number;
}

const FounderDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalTeachers: 0, totalClasses: 0, todayAttendanceRate: 0, pendingTasks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.institution_id) return;
    const fetchStats = async () => {
      const instId = profile.institution_id!;
      const [studentsRes, teachersRes, classesRes, tasksRes, attendanceRes, totalStudentsForAttendance] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("status", "pending"),
        supabase.from("attendance").select("id, status").eq("institution_id", instId).eq("date", new Date().toISOString().split("T")[0]),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", instId),
      ]);

      const presentCount = attendanceRes.data?.filter(a => a.status === "Present").length || 0;
      const totalAttendanceRecords = attendanceRes.data?.length || 0;
      const rate = totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 100) : 0;

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalClasses: classesRes.count || 0,
        todayAttendanceRate: rate,
        pendingTasks: tasksRes.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, [profile?.institution_id]);

  const statCards = [
    { label: "Total Students", value: stats.totalStudents, icon: GraduationCap, color: "text-primary" },
    { label: "Total Teachers", value: stats.totalTeachers, icon: Users, color: "text-secondary" },
    { label: "Total Classes", value: stats.totalClasses, icon: BookOpen, color: "text-primary" },
    { label: "Today's Attendance", value: `${stats.todayAttendanceRate}%`, icon: ClipboardCheck, color: "text-primary" },
    { label: "Pending Tasks", value: stats.pendingTasks, icon: ListTodo, color: "text-secondary" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name || "Founder"}</h1>
          <p className="text-muted-foreground text-sm">Here's your school overview</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FounderDashboard;
