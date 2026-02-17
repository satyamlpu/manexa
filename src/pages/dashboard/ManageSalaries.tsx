import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, X, Download } from "lucide-react";
import { exportSalarySlipPDF } from "@/lib/pdfExport";

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const ManageSalaries = () => {
  const { profile } = useAuth();
  const [salaries, setSalaries] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ teacher_id: "", month: "", year: new Date().getFullYear().toString(), base_salary: "", bonus: "0", deductions: "0" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!profile?.institution_id) return;
    const instId = profile.institution_id!;
    const [sRes, tRes] = await Promise.all([
      supabase.from("teacher_salaries").select("*").eq("institution_id", instId).order("created_at", { ascending: false }),
      supabase.from("teachers").select("id, user_id").eq("institution_id", instId),
    ]);
    
    const teacherData = tRes.data || [];
    const userIds = teacherData.map(t => t.user_id);
    const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : { data: [] };
    
    const profileMap: Record<string, string> = {};
    profiles?.forEach(p => { profileMap[p.user_id] = p.full_name; });
    
    const teacherMap: Record<string, any> = {};
    teacherData.forEach(t => { teacherMap[t.id] = { ...t, profiles: { full_name: profileMap[t.user_id] || "—" } }; });
    
    setSalaries((sRes.data || []).map(s => ({ ...s, teachers: teacherMap[s.teacher_id] || null })));
    setTeachers(teacherData.map(t => ({ ...t, profiles: { full_name: profileMap[t.user_id] || "—" } })));
  };

  useEffect(() => { fetchData(); }, [profile?.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const base = parseFloat(form.base_salary);
    const bonus = parseFloat(form.bonus || "0");
    const deductions = parseFloat(form.deductions || "0");
    const net = base + bonus - deductions;
    
    const { error: err } = await supabase.from("teacher_salaries").insert({
      institution_id: profile!.institution_id!,
      teacher_id: form.teacher_id,
      month: form.month,
      year: parseInt(form.year),
      base_salary: base,
      bonus,
      deductions,
      net_salary: net,
    });
    if (err) setError(err.message);
    else {
      setShowForm(false);
      setForm({ teacher_id: "", month: "", year: new Date().getFullYear().toString(), base_salary: "", bonus: "0", deductions: "0" });
      fetchData();
    }
    setLoading(false);
  };

  const markPaid = async (id: string) => {
    await supabase.from("teacher_salaries").update({ status: "paid", paid_date: new Date().toISOString() }).eq("id", id);
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Teacher Salaries</h1>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Add Salary"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-3">
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-2">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required>
                <option value="">Select Teacher</option>
                {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.profiles?.full_name}</option>)}
              </select>
              <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required>
                <option value="">Select Month</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input placeholder="Year" type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input placeholder="Base Salary" type="number" step="0.01" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input placeholder="Bonus" type="number" step="0.01" value={form.bonus} onChange={e => setForm({ ...form, bonus: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
              <input placeholder="Deductions" type="number" step="0.01" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {loading ? "Creating..." : "Add Salary Record"}
            </button>
          </form>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Teacher</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Base</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Net</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {salaries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No salary records yet</td></tr>
              ) : (
                salaries.map((s: any) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3">{s.teachers?.profiles?.full_name || "—"}</td>
                    <td className="px-4 py-3">{s.month} {s.year}</td>
                    <td className="px-4 py-3">₹{s.base_salary}</td>
                    <td className="px-4 py-3 font-medium">₹{s.net_salary}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${s.status === "paid" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      {s.status !== "paid" && (
                        <button onClick={() => markPaid(s.id)} className="text-xs text-primary hover:underline">Mark Paid</button>
                      )}
                      <button
                        onClick={() => exportSalarySlipPDF({
                          teacherName: s.teachers?.profiles?.full_name || "—",
                          month: s.month,
                          year: s.year,
                          baseSalary: s.base_salary,
                          bonus: s.bonus,
                          deductions: s.deductions,
                          netSalary: s.net_salary,
                          status: s.status,
                          paidDate: s.paid_date,
                        })}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        title="Download Salary Slip"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageSalaries;
