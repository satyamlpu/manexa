import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import {
  Users, GraduationCap, BookOpen, ClipboardCheck, ListTodo,
  IndianRupee, Wallet, AlertTriangle, CheckCircle, TrendingUp,
  Megaphone, ArrowRight, Key, Copy, Eye, EyeOff, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { toast } from "@/hooks/use-toast";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
];

const FounderDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [institutionToken, setInstitutionToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [realtimePresent, setRealtimePresent] = useState<string[]>([]);

  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalClasses: 0, totalParents: 0,
    todayPresentCount: 0, todayAbsentCount: 0,
    todayAttendanceRate: 0, pendingTasks: 0,
    pendingFees: 0, pendingSalaries: 0, feeCollectedToday: 0,
  });

  const [attendanceChart, setAttendanceChart] = useState<any[]>([]);
  const [feeChart, setFeeChart] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ type: "red" | "yellow" | "green"; message: string }[]>([]);

  useEffect(() => {
    if (!profile?.institution_id) return;
    const instId = profile.institution_id!;

    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // Fetch institution credentials
      const { data: inst } = await supabase
        .from("institutions")
        .select("token, api_key")
        .eq("id", instId)
        .single();
      if (inst) {
        setInstitutionToken((inst as any).token || "");
        setApiKey((inst as any).api_key || "");
      }

      const [studentsRes, teachersRes, classesRes, tasksRes, attendanceRes, feesRes, salariesRes, parentRolesRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("status", "pending"),
        supabase.from("attendance").select("status").eq("institution_id", instId).eq("date", today),
        supabase.from("fees").select("status, amount, paid_amount").eq("institution_id", instId),
        supabase.from("teacher_salaries").select("status, net_salary").eq("institution_id", instId),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("role", "PARENT"),
      ]);

      const presentToday = attendanceRes.data?.filter(a => a.status === "Present").length || 0;
      const totalToday = attendanceRes.data?.length || 0;
      const rate = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;
      const paidFees = feesRes.data?.filter(f => f.status === "paid").reduce((s, f) => s + Number(f.paid_amount), 0) || 0;
      const pendingFeeAmount = feesRes.data?.filter(f => f.status === "pending").reduce((s, f) => s + Number(f.amount) - Number(f.paid_amount), 0) || 0;
      const pendingFeeCount = feesRes.data?.filter(f => f.status === "pending").length || 0;
      const pendingSalCount = salariesRes.data?.filter(s => s.status === "pending").length || 0;

      setStats({
        totalStudents: studentsRes.count || 0, totalTeachers: teachersRes.count || 0,
        totalClasses: classesRes.count || 0, totalParents: parentRolesRes.count || 0,
        todayPresentCount: presentToday, todayAbsentCount: totalToday - presentToday,
        todayAttendanceRate: rate, pendingTasks: tasksRes.count || 0,
        pendingFees: pendingFeeCount, pendingSalaries: pendingSalCount, feeCollectedToday: paidFees,
      });

      setFeeChart([{ name: "Collected", value: paidFees }, { name: "Pending", value: pendingFeeAmount }]);

      const days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const { data: dayData } = await supabase.from("attendance").select("status").eq("institution_id", instId).eq("date", dateStr);
        const present = dayData?.filter(a => a.status === "Present").length || 0;
        const absent = (dayData?.length || 0) - present;
        days.push({ date: d.toLocaleDateString("en", { weekday: "short" }), present, absent });
      }
      setAttendanceChart(days);

      const newAlerts: { type: "red" | "yellow" | "green"; message: string }[] = [];
      if (rate < 70 && totalToday > 0) newAlerts.push({ type: "red", message: `Today's attendance is critically low (${rate}%)` });
      else if (rate < 85 && totalToday > 0) newAlerts.push({ type: "yellow", message: `Today's attendance is below target (${rate}%)` });
      else if (totalToday > 0) newAlerts.push({ type: "green", message: `Attendance is healthy today (${rate}%)` });
      if (pendingFeeCount > 0) newAlerts.push({ type: "yellow", message: `${pendingFeeCount} student fee${pendingFeeCount > 1 ? "s" : ""} pending` });
      if (pendingSalCount > 0) newAlerts.push({ type: "red", message: `${pendingSalCount} teacher salary payment${pendingSalCount > 1 ? "s" : ""} pending` });
      setAlerts(newAlerts);
      setLoading(false);
    };

    load();

    // Real-time attendance subscription
    const channel = supabase
      .channel("founder-attendance")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance" }, (payload) => {
        const rec = payload.new as any;
        if (rec.institution_id === instId && rec.status === "Present") {
          setRealtimePresent(prev => [...prev, rec.student_id]);
          setStats(prev => ({
            ...prev,
            todayPresentCount: prev.todayPresentCount + 1,
            todayAttendanceRate: prev.totalStudents > 0
              ? Math.round(((prev.todayPresentCount + 1) / prev.totalStudents) * 100) : 0,
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.institution_id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const overviewCards = [
    { label: "Total Students", value: stats.totalStudents, icon: GraduationCap, color: "text-primary", bg: "bg-primary/10", href: "/dashboard/founder/students" },
    { label: "Total Teachers", value: stats.totalTeachers, icon: Users, color: "text-secondary", bg: "bg-secondary/10", href: "/dashboard/founder/teachers" },
    { label: "Total Classes", value: stats.totalClasses, icon: BookOpen, color: "text-accent", bg: "bg-accent/10", href: "/dashboard/founder/classes" },
    { label: "Total Parents", value: stats.totalParents, icon: Users, color: "text-primary", bg: "bg-primary/10", href: "/dashboard/founder" },
  ];

  const dailyCards = [
    { label: "Today Attendance", value: `${stats.todayAttendanceRate}%`, icon: ClipboardCheck, color: stats.todayAttendanceRate >= 85 ? "text-primary" : "text-destructive" },
    { label: "Absent Today", value: stats.todayAbsentCount, icon: AlertTriangle, color: "text-destructive" },
    { label: "Pending Tasks", value: stats.pendingTasks, icon: ListTodo, color: "text-secondary" },
    { label: "Pending Fees", value: stats.pendingFees, icon: IndianRupee, color: "text-destructive" },
    { label: "Pending Salaries", value: stats.pendingSalaries, icon: Wallet, color: "text-destructive" },
  ];

  const quickActions = [
    { label: "Add Student", icon: GraduationCap, href: "/dashboard/founder/students" },
    { label: "Add Teacher", icon: Users, href: "/dashboard/founder/teachers" },
    { label: "Create Class", icon: BookOpen, href: "/dashboard/founder/classes" },
    { label: "Post Announcement", icon: Megaphone, href: "/dashboard/founder/announcements" },
    { label: "Mark Attendance", icon: ClipboardCheck, href: "/dashboard/founder/attendance" },
    { label: "Manage Fees", icon: IndianRupee, href: "/dashboard/founder/fees" },
  ];

  const alertColors = {
    red: "border-destructive/40 bg-destructive/10 text-destructive",
    yellow: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    green: "border-primary/40 bg-primary/10 text-primary",
  };
  const alertIcons = { red: AlertTriangle, yellow: AlertTriangle, green: CheckCircle };

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
          <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(" ")[0] || "Founder"} 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Here's your institution at a glance</p>
        </div>

        {/* Institution Token & API Key */}
        {(institutionToken || apiKey) && (
          <section className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Institution Credentials</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Share the Institution Token with teachers and students so they can self-register.</p>
            <div className="space-y-3">
              {institutionToken && (
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  <span className="text-xs font-medium text-muted-foreground w-28 flex-shrink-0">Institution Token</span>
                  <code className="text-sm font-mono flex-1">{showToken ? institutionToken : "••••••••••••"}</code>
                  <button onClick={() => setShowToken(!showToken)} className="text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => copyToClipboard(institutionToken, "Token")} className="text-muted-foreground hover:text-foreground">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
              {apiKey && (
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  <span className="text-xs font-medium text-muted-foreground w-28 flex-shrink-0">API Key</span>
                  <code className="text-sm font-mono flex-1 truncate">{showApiKey ? apiKey : "••••••••••••••••••••"}</code>
                  <button onClick={() => setShowApiKey(!showApiKey)} className="text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => copyToClipboard(apiKey, "API Key")} className="text-muted-foreground hover:text-foreground">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Real-time Present Indicator */}
        {realtimePresent.length > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">{realtimePresent.length} student(s) marked present just now (live)</span>
          </div>
        )}

        {/* Institution Overview */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Institution Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {overviewCards.map((card) => (
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
        </section>

        {/* Daily Control Panel */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Daily Control Panel</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {dailyCards.map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Analytics Charts */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Performance Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <IndianRupee className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Fee Collection Overview</h3>
              </div>
              {feeChart.some(f => f.value > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={feeChart} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}>
                      {feeChart.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No fee data yet</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Alert System */}
        {alerts.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Alert System</h2>
            <div className="space-y-2">
              {alerts.map((alert, i) => {
                const Icon = alertIcons[alert.type];
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${alertColors[alert.type]}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {alert.message}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action) => (
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

export default FounderDashboard;
