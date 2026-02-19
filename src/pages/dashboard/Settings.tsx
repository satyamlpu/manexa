import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Save, Building2, User, Loader2, CheckCircle } from "lucide-react";

const Settings = () => {
  const { profile, user, refreshUserData } = useAuth();

  const [instForm, setInstForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "" });
  const [instLoading, setInstLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [instSaved, setInstSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [instError, setInstError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [institution, setInstitution] = useState<any>(null);

  useEffect(() => {
    if (!profile?.institution_id) return;
    supabase
      .from("institutions")
      .select("*")
      .eq("id", profile.institution_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setInstitution(data);
          setInstForm({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
          });
        }
      });
    setProfileForm({
      full_name: profile.full_name || "",
      email: profile.email || "",
    });
  }, [profile]);

  const handleInstSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.institution_id) return;
    setInstError("");
    setInstLoading(true);
    const { error } = await supabase
      .from("institutions")
      .update({
        name: instForm.name,
        email: instForm.email || null,
        phone: instForm.phone || null,
        address: instForm.address || null,
      })
      .eq("id", profile.institution_id);
    setInstLoading(false);
    if (error) {
      setInstError(error.message);
    } else {
      setInstSaved(true);
      setTimeout(() => setInstSaved(false), 3000);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileError("");
    setProfileLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profileForm.full_name })
      .eq("user_id", user.id);
    setProfileLoading(false);
    if (error) {
      setProfileError(error.message);
    } else {
      await refreshUserData();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your institution and profile details</p>
        </div>

        {/* Institution Settings */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold text-sm">Institution Details</h2>
              <p className="text-xs text-muted-foreground">Update your school or institution information</p>
            </div>
          </div>
          <form onSubmit={handleInstSave} className="p-5 space-y-4">
            {instError && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{instError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Institution Name *</label>
                <input
                  value={instForm.name}
                  onChange={e => setInstForm({ ...instForm, name: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={instForm.email}
                  onChange={e => setInstForm({ ...instForm, email: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone</label>
                <input
                  value={instForm.phone}
                  onChange={e => setInstForm({ ...instForm, phone: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Address</label>
                <textarea
                  value={instForm.address}
                  onChange={e => setInstForm({ ...instForm, address: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={instLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {instLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Institution
              </button>
              {instSaved && (
                <span className="flex items-center gap-1.5 text-sm text-primary">
                  <CheckCircle className="w-4 h-4" /> Saved!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Profile Settings */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <User className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold text-sm">Your Profile</h2>
              <p className="text-xs text-muted-foreground">Update your personal information</p>
            </div>
          </div>
          <form onSubmit={handleProfileSave} className="p-5 space-y-4">
            {profileError && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{profileError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
                <input
                  value={profileForm.full_name}
                  onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email (read-only)</label>
                <input
                  value={profileForm.email}
                  disabled
                  className="w-full h-10 rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={profileLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Profile
              </button>
              {profileSaved && (
                <span className="flex items-center gap-1.5 text-sm text-primary">
                  <CheckCircle className="w-4 h-4" /> Saved!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Read-only info */}
        {institution && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3">System Information</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Subscription Plan</p>
                <p className="font-medium capitalize">{institution.subscription_plan || "Free"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Institution ID</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{institution.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(institution.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
