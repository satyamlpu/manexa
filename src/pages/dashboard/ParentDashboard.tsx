import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ClipboardCheck, ListTodo, Megaphone, IndianRupee } from "lucide-react";

const ParentDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ attendanceRate: 0, pendingTasks: 0, announcements: 0, pendingFees: 0 });
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !profile?.institution_id) return;
    const fetchData = async () => {
      const instId = profile.institution_id!;
      // Find children linked to this parent
      const { data: studentData } = await supabase
        .from("students")
        .select("id, roll_number, user_id, class_id, profiles:user_id(full_name), classes:class_id(class_name, section)")
        .eq("institution_id", instId)
        .eq("parent_user_id", user.id);
      
      setChildren(studentData || []);
      
      const studentIds = (studentData || []).map((s: any) => s.id);
      
      if (studentIds.length > 0) {
        const [att, fees, ann] = await Promise.all([
          supabase.from("attendance").select("status").eq("institution_id", instId).in("student_id", studentIds),
          supabase.from("fees").select("id, status").eq("institution_id", instId).in("student_id", studentIds).eq("status", "pending"),
          supabase.from("announcements").select("id", { count: "exact", head: true }).eq("institution_id", instId),
        ]);
        const present = att.data?.filter(a => a.status === "Present").length || 0;
        const total = att.data?.length || 0;
        setStats({
          attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
          pendingTasks: 0,
          announcements: ann.count || 0,
          pendingFees: fees.data?.length || 0,
        });
      }
    };
    fetchData();
  }, [user, profile?.institution_id]);

  const statCards = [
    { label: "Children's Attendance", value: `${stats.attendanceRate}%`, icon: ClipboardCheck, color: "text-primary" },
    { label: "Pending Fees", value: stats.pendingFees, icon: IndianRupee, color: "text-destructive" },
    { label: "Announcements", value: stats.announcements, icon: Megaphone, color: "text-secondary" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name || "Parent"}</h1>
          <p className="text-muted-foreground text-sm">Your children's school overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-xl p-5">
              <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">My Children</h2>
          {children.length === 0 ? (
            <p className="text-muted-foreground text-sm">No children linked to your account yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {children.map((child: any) => (
                <div key={child.id} className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-medium">{child.profiles?.full_name || "—"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {child.classes ? `${child.classes.class_name} ${child.classes.section || ""}` : "No class"} • Roll #{child.roll_number || "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;
