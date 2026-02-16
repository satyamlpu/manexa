import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, X } from "lucide-react";

const ManageFees = () => {
  const { profile, primaryRole } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_id: "", title: "", amount: "", due_date: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canManage = primaryRole === "FOUNDER" || primaryRole === "PRINCIPAL";

  const fetchData = async () => {
    if (!profile?.institution_id) return;
    const instId = profile.institution_id!;
    const [f, s] = await Promise.all([
      supabase.from("fees").select("*, students!inner(id, roll_number, user_id, profiles:user_id(full_name))").eq("institution_id", instId).order("created_at", { ascending: false }),
      supabase.from("students").select("id, roll_number, user_id, profiles:user_id(full_name)").eq("institution_id", instId),
    ]);
    setFees(f.data || []);
    setStudents(s.data || []);
  };

  useEffect(() => { fetchData(); }, [profile?.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.from("fees").insert({
      institution_id: profile!.institution_id!,
      student_id: form.student_id,
      title: form.title,
      amount: parseFloat(form.amount),
      due_date: form.due_date || null,
    });
    if (err) setError(err.message);
    else {
      setShowForm(false);
      setForm({ student_id: "", title: "", amount: "", due_date: "" });
      fetchData();
    }
    setLoading(false);
  };

  const markPaid = async (feeId: string, amount: number) => {
    await supabase.from("fees").update({
      status: "paid",
      paid_amount: amount,
      payment_date: new Date().toISOString(),
      receipt_number: `RCP-${Date.now()}`,
    }).eq("id", feeId);
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fees Management</h1>
          {canManage && (
            <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "Add Fee"}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-3">
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-2">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required>
                <option value="">Select Student</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.profiles?.full_name} (Roll: {s.roll_number || "—"})</option>)}
              </select>
              <input placeholder="Fee Title (e.g. Tuition Fee)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input placeholder="Amount" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {loading ? "Creating..." : "Add Fee"}
            </button>
          </form>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                {canManage && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>}
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No fees records yet</td></tr>
              ) : (
                fees.map((f: any) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="px-4 py-3">{f.students?.profiles?.full_name || "—"}</td>
                    <td className="px-4 py-3">{f.title}</td>
                    <td className="px-4 py-3">₹{f.amount}</td>
                    <td className="px-4 py-3">{f.due_date || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${f.status === "paid" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {f.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        {f.status !== "paid" && (
                          <button onClick={() => markPaid(f.id, f.amount)} className="text-xs text-primary hover:underline">Mark Paid</button>
                        )}
                      </td>
                    )}
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

export default ManageFees;
