import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, X } from "lucide-react";

const ManageAnnouncements = () => {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = async () => {
    if (!profile?.institution_id) return;
    const { data } = await supabase.from("announcements").select("*, poster:posted_by(full_name)").eq("institution_id", profile.institution_id).order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  useEffect(() => { fetchAnnouncements(); }, [profile?.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.institution_id) return;
    setLoading(true);
    await supabase.from("announcements").insert({
      institution_id: profile.institution_id,
      title: form.title,
      content: form.content,
      posted_by: user.id,
    });
    setShowForm(false);
    setForm({ title: "", content: "" });
    fetchAnnouncements();
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Announcements</h1>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New Announcement"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" required />
            <textarea placeholder="Content" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[100px]" required />
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {loading ? "Posting..." : "Post Announcement"}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {announcements.length === 0 ? (
            <p className="text-muted-foreground text-sm">No announcements yet.</p>
          ) : (
            announcements.map((a: any) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-medium">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-2">Posted {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageAnnouncements;
