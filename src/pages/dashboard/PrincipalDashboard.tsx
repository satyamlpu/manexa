import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import {
  Users, GraduationCap, ClipboardCheck, ListTodo, Megaphone,
  IndianRupee, BookOpen, ArrowRight, TrendingUp, AlertTriangle, CheckCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const PrincipalDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    teachers: 0, students: 0, classes: 0,
    attendanceRate: 0, presentToday: 0, absentToday: 0,
    pendingTasks: 0, pendingFees: 0, announcements: 0,
  });
  const [attendanceChart, setAttendanceChart] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ type: "red" | "yellow" | "green"; message: string }[]>([]);

  useEffect(() => {
    if (!profile?.institution_id) return;
    const instId = profile.institution_id!;

    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const [t, s, c, att, tasks, fees, ann] = await Promise.all([
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("attendance").select("status").eq("institution_id", instId).eq("date", today),
        supabase.from("tasks").select("*").eq("institution_id", instId).order("created_at", { ascending: false }).limit(5),
        supabase.from("fees").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("status", "pending"),
        supabase.from("announcements").select("id", { count: "exact", head: true }).eq("institution_id", instId),
      ]);

      const present = att.data?.filter(a => a.status === "Present").length || 0;
      const total = att.data?.length || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      const pendingTaskCount = (tasks.data || []).filter(t => t.status === "pending").length;

      setStats({
        teachers: t.count || 0, students: s.count || 0, classes: c.count || 0,
        attendanceRate: rate, presentToday: present, absentToday: total - present,
        pendingTasks: pendingTaskCount, pendingFees: fees.count || 0, announcements: ann.count || 0,
      });

      // Fetch assignee names for tasks
      const taskData = tasks.data || [];
      const assigneeIds = [...new Set(taskData.filter(t => t.assigned_to).map(t => t.assigned_to))];
      let namesMap: Record<string, string> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", assigneeIds);
        (profiles || []).forEach(p => { namesMap[p.user_id] = p.full_name; });
      }
      setRecentTasks(taskData.map(t => ({ ...t, assignee_name: namesMap[t.assigned_to] || null })));

      // 7-day attendance chart
      const days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const { data: dayData } = await supabase.from("attendance").select("status").eq("institution_id", instId).eq("date", dateStr);
        const p = dayData?.filter(a => a.status === "Present").length || 0;
        days.push({ date: d.toLocaleDateString("en", { weekday: "short" }), present: p, absent: (dayData?.length || 0) - p });
      }
      setAttendanceChart(days);

      // Alerts
      const newAlerts: { type: "red" | "yellow" | "green"; message: string }[] = [];
      if (rate < 70 && total > 0) newAlerts.push({ type: "red", message: `Attendance critically low today (${rate}%)` });
      else if (rate < 85 && total > 0) newAlerts.push({ type: "yellow", message: `Attendance below target (${rate}%)` });
      else if (total > 0) newAlerts.push({ type: "green", message: `Attendance is healthy (${rate}%)` });
      if ((fees.count || 0) > 0) newAlerts.push({ type: "yellow", message: `${fees.count} pending fee(s)` });
      setAlerts(newAlerts);

      setLoading(false);
    };
    load();
  }, [profile?.institution_id]);

  const overviewCards = [
    { label: "Teachers", value: stats.teachers, icon: Users, color: "text-primary", bg: "bg-primary/10", href: "/dashboard/principal/teachers" },
    { label: "Students", value: stats.students, icon: GraduationCap, color: "text-secondary", bg: "bg-secondary/10", href: "/dashboard/principal/students" },
    { label: "Classes", value: stats.classes, icon: BookOpen, color: "text-accent", bg: "bg-accent/10", href: "/dashboard/principal" },
    { label: "Attendance", value: `${stats.attendanceRate}%`, icon: ClipboardCheck, color: stats.attendanceRate >= 85 ? "text-primary" : "text-destructive", bg: stats.attendanceRate >= 85 ? "bg-primary/10" : "bg-destructive/10", href: "/dashboard/principal/attendance" },
  ];

  const quickActions = [
    { label: "Mark Attendance", icon: ClipboardCheck, href: "/dashboard/principal/attendance" },
    { label: "Manage Teachers", icon: Users, href: "/dashboard/principal/teachers" },
    { label: "Manage Students", icon: GraduationCap, href: "/dashboard/principal/students" },
    { label: "Assign Tasks", icon: ListTodo, href: "/dashboard/principal/tasks" },
    { label: "Announcements", icon: Megaphone, href: "/dashboard/principal/announcements" },
    { label: "Manage Fees", icon: IndianRupee, href: "/dashboard/principal/fees" },
  ];

  const alertColors = {
    red: "border-destructive/40 bg-destructive/10 text-destructive",
    yellow: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    green: "border-primary/40 bg-primary/10 text-primary",
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name?.split(" ")[0] || "Principal"} 👋</h1>
          <p className="text-muted-foreground text-sm">Your institution overview</p>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${alertColors[a.type]}`}>
                {a.type === "green" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {a.message}
              </div>
            ))}
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {overviewCards.map(card => (
            <button key={card.label} onClick={() => navigate(card.href)}
              className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}><card.icon className={`w-4 h-4 ${card.color}`} /></div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </button>
          ))}
        </div>

        {/* Daily Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CheckCircle className="w-4 h-4 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Present Today</p><p className="text-xl font-bold text-primary">{stats.presentToday}</p></div>
          </div>
          <div className="bg-card border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">Absent Today</p><p className="text-xl font-bold text-destructive">{stats.absentToday}</p></div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><ListTodo className="w-4 h-4 text-yellow-500" /></div>
            <div><p className="text-xs text-muted-foreground">Pending Tasks</p><p className="text-xl font-bold">{stats.pendingTasks}</p></div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><IndianRupee className="w-4 h-4 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">Pending Fees</p><p className="text-xl font-bold">{stats.pendingFees}</p></div>
          </div>
        </div>

        {/* Attendance Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Attendance Trend (7 Days)</h3>
          </div>
          {attendanceChart.some(d => d.present > 0 || d.absent > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attendanceChart} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="present" name="Present" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No attendance data yet</p>
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Recent Tasks</h3>
            </div>
            <button onClick={() => navigate("/dashboard/principal/tasks")}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentTasks.length > 0 ? (
            <div className="space-y-2">
              {recentTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.assignee_name ? `Assigned to ${t.assignee_name}` : "Unassigned"}
                      {t.due_date ? ` • Due ${new Date(t.due_date).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    t.status === "completed" ? "bg-green-500/10 text-green-500 border-green-500/30" :
                    t.status === "in_progress" ? "bg-primary/10 text-primary border-primary/30" :
                    "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                  }`}>
                    {t.status?.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
          )}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map(action => (
              <button key={action.label} onClick={() => navigate(action.href)}
                className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <action.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default PrincipalDashboard;
