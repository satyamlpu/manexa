import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, GraduationCap, ClipboardCheck } from "lucide-react";

const PrincipalDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ teachers: 0, students: 0, attendanceRate: 0 });

  useEffect(() => {
    if (!profile?.institution_id) return;
    const fetch = async () => {
      const instId = profile.institution_id!;
      const [t, s, a] = await Promise.all([
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        supabase.from("attendance").select("id, status").eq("institution_id", instId).eq("date", new Date().toISOString().split("T")[0]),
      ]);
      const present = a.data?.filter(r => r.status === "Present").length || 0;
      const total = a.data?.length || 0;
      setStats({ teachers: t.count || 0, students: s.count || 0, attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0 });
    };
    fetch();
  }, [profile?.institution_id]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Principal Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <Users className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Teachers</p>
            <p className="text-2xl font-bold">{stats.teachers}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <GraduationCap className="w-5 h-5 text-secondary mb-2" />
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="text-2xl font-bold">{stats.students}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <ClipboardCheck className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Today's Attendance</p>
            <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PrincipalDashboard;
