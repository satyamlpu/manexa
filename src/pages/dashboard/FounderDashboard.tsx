import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, GraduationCap, BookOpen, ClipboardCheck, ListTodo, IndianRupee, Wallet } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayAttendanceRate: number;
  pendingTasks: number;
  pendingFees: number;
  pendingSalaries: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--destructive))", "hsl(var(--accent))"];

const FounderDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalTeachers: 0, totalClasses: 0, todayAttendanceRate: 0, pendingTasks: 0, pendingFees: 0, pendingSalaries: 0 });
  const [loading, setLoading] = useState(true);
  const [attendanceChart, setAttendanceChart] = useState<any[]>([]);
  const [feeChart, setFeeChart] = useState<any[]>([]);
  const [salaryChart, setSalaryChart] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.institution_id) return;
    const instId = profile.institution_id!;

    const fetchStats = async () => {
      const [studentsRes, teachersRes, classesRes, tasksRes, attendanceRes, feesRes, salariesRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("status", "pending"),
        supabase.from("attendance").select("id, status").eq("institution_id", instId).eq("date", new Date().toISOString().split("T")[0]),
        supabase.from("fees").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("status", "pending"),
        supabase.from("teacher_salaries").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("status", "pending"),
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
        pendingFees: feesRes.count || 0,
        pendingSalaries: salariesRes.count || 0,
      });

      // Attendance trend (last 7 days)
      const days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const { data: dayData } = await supabase
          .from("attendance")
          .select("status")
          .eq("institution_id", instId)
          .eq("date", dateStr);
        const present = dayData?.filter(a => a.status === "Present").length || 0;
        const total = dayData?.length || 0;
        days.push({
          date: d.toLocaleDateString("en", { weekday: "short" }),
          rate: total > 0 ? Math.round((present / total) * 100) : 0,
          present,
          absent: total - present,
        });
      }
      setAttendanceChart(days);

      // Fee collection overview
      const { data: allFees } = await supabase.from("fees").select("status, amount, paid_amount").eq("institution_id", instId);
      const paid = allFees?.filter(f => f.status === "paid").reduce((s, f) => s + Number(f.paid_amount), 0) || 0;
      const pending = allFees?.filter(f => f.status === "pending").reduce((s, f) => s + Number(f.amount) - Number(f.paid_amount), 0) || 0;
      setFeeChart([
        { name: "Collected", value: paid },
        { name: "Pending", value: pending },
      ]);

      // Salary overview
      const { data: allSalaries } = await supabase.from("teacher_salaries").select("status, net_salary").eq("institution_id", instId);
      const paidSal = allSalaries?.filter(s => s.status === "paid").reduce((s, f) => s + Number(f.net_salary), 0) || 0;
      const pendingSal = allSalaries?.filter(s => s.status === "pending").reduce((s, f) => s + Number(f.net_salary), 0) || 0;
      setSalaryChart([
        { name: "Paid", value: paidSal },
        { name: "Pending", value: pendingSal },
      ]);

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
    { label: "Pending Fees", value: stats.pendingFees, icon: IndianRupee, color: "text-destructive" },
    { label: "Pending Salaries", value: stats.pendingSalaries, icon: Wallet, color: "text-destructive" },
  ];

  const chartConfig = {
    rate: { label: "Attendance %", color: "hsl(var(--primary))" },
    present: { label: "Present", color: "hsl(var(--primary))" },
    absent: { label: "Absent", color: "hsl(var(--destructive))" },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name || "Founder"}</h1>
          <p className="text-muted-foreground text-sm">Here's your school overview</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Trend */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Attendance Trend (Last 7 Days)</h3>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={attendanceChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis unit="%" className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Fee Collection */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Fee Collection Overview</h3>
                <div className="h-[250px] flex items-center justify-center">
                  {feeChart.every(f => f.value === 0) ? (
                    <p className="text-sm text-muted-foreground">No fee data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={feeChart} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}>
                          {feeChart.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Salary Expenses */}
              <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold mb-4">Salary Expense Overview</h3>
                <div className="h-[250px] flex items-center justify-center">
                  {salaryChart.every(s => s.value === 0) ? (
                    <p className="text-sm text-muted-foreground">No salary data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salaryChart}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FounderDashboard;
