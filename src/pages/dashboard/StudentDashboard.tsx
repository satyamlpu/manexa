import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ClipboardCheck, ListTodo, Megaphone, UserCheck, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ attendanceRate: 0, totalPresent: 0, totalAbsent: 0, pendingTasks: 0, announcements: 0 });
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [weekChart, setWeekChart] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !profile?.institution_id) return;
    const instId = profile.institution_id!;

    const load = async () => {
      setLoading(true);

      // Get student record
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("institution_id", instId)
        .eq("user_id", user.id)
        .single();

      const studentId = student?.id;

      const [att, tasks, ann, face] = await Promise.all([
        studentId
          ? supabase.from("attendance").select("status, date").eq("institution_id", instId).eq("student_id", studentId).order("date", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("assigned_to", user.id).eq("status", "pending"),
        supabase.from("announcements").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("face_data").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("user_id", user.id),
      ]);

      const records = att.data || [];
      const present = records.filter(a => a.status === "Present").length;
      const total = records.length;

      setStats({
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        totalPresent: present,
        totalAbsent: total - present,
        pendingTasks: tasks.count || 0,
        announcements: ann.count || 0,
      });

      setFaceRegistered((face.count || 0) > 0);
      setRecentAttendance(records.slice(0, 10));

      // Weekly chart
      const days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayRecord = records.find(r => r.date === dateStr);
        days.push({
          date: d.toLocaleDateString("en", { weekday: "short" }),
          present: dayRecord?.status === "Present" ? 1 : 0,
          absent: dayRecord?.status === "Absent" ? 1 : 0,
        });
      }
      setWeekChart(days);
      setLoading(false);
    };

    load();

    // Real-time attendance updates
    const channel = supabase
      .channel("student-attendance")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance" }, (payload) => {
        const rec = payload.new as any;
        if (rec.institution_id === instId) {
          // Check if this is for this student
          supabase.from("students").select("id").eq("user_id", user.id).eq("institution_id", instId).single().then(({ data: stu }) => {
            if (stu && rec.student_id === stu.id && rec.status === "Present") {
              setStats(prev => ({
                ...prev,
                totalPresent: prev.totalPresent + 1,
                attendanceRate: Math.round(((prev.totalPresent + 1) / (prev.totalPresent + prev.totalAbsent + 1)) * 100),
              }));
            }
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, profile?.institution_id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name?.split(" ")[0] || "Student"} 👋</h1>
          <p className="text-muted-foreground text-sm">Your attendance and activity overview</p>
        </div>

        {/* Face Registration Status */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          faceRegistered
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-destructive/40 bg-destructive/10 text-destructive"
        }`}>
          {faceRegistered ? <UserCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {faceRegistered ? "Face Registered — Ready for attendance" : "Face Not Registered — Please register your face for attendance"}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <ClipboardCheck className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Attendance Rate</p>
            <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Total Present</p>
            <p className="text-2xl font-bold">{stats.totalPresent}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <XCircle className="w-5 h-5 text-destructive mb-2" />
            <p className="text-xs text-muted-foreground">Total Absent</p>
            <p className="text-2xl font-bold">{stats.totalAbsent}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <ListTodo className="w-5 h-5 text-secondary mb-2" />
            <p className="text-xs text-muted-foreground">Pending Tasks</p>
            <p className="text-2xl font-bold">{stats.pendingTasks}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <Megaphone className="w-5 h-5 text-accent mb-2" />
            <p className="text-xs text-muted-foreground">Announcements</p>
            <p className="text-2xl font-bold">{stats.announcements}</p>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">This Week's Attendance</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekChart} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 1]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="present" name="Present" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Attendance */}
        {recentAttendance.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Recent Attendance</h3>
            <div className="space-y-2">
              {recentAttendance.map((rec, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">{new Date(rec.date).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    rec.status === "Present" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  }`}>{rec.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
