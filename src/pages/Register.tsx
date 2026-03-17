import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import manexaLogo from "@/assets/manexa-logo.svg";
import { School, Users, GraduationCap, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

type RegistrationType = "founder" | "teacher" | "student" | "staff" | null;

const Register = () => {
  const [regType, setRegType] = useState<RegistrationType>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Founder fields
  const [institutionName, setInstitutionName] = useState("");
  const [address, setAddress] = useState("");
  const [founderStep, setFounderStep] = useState(1);

  // Teacher/Student/Staff fields
  const [institutionToken, setInstitutionToken] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [department, setDepartment] = useState("");

  const { signUp, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const registrationOptions = [
    {
      type: "founder" as const,
      title: "Founder / Admin",
      description: "Register your institution and become the administrator",
      icon: School,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/30 hover:border-primary/60",
    },
    {
      type: "teacher" as const,
      title: "Staff / Teacher",
      description: "Join an existing institution as a teacher",
      icon: Users,
      color: "text-secondary",
      bg: "bg-secondary/10 border-secondary/30 hover:border-secondary/60",
    },
    {
      type: "student" as const,
      title: "Student",
      description: "Join an existing institution as a student",
      icon: GraduationCap,
      color: "text-accent",
      bg: "bg-accent/10 border-accent/30 hover:border-accent/60",
    },
    {
      type: "staff" as const,
      title: "Staff",
      description: "Join an existing institution as staff member",
      icon: Users,
      color: "text-muted-foreground",
      bg: "bg-muted border-border hover:border-foreground/30",
    },
  ];

  const handleFounderStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    setFounderStep(2);
  };

  const handleFounderStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName);
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const response = await supabase.functions.invoke("register-institution", {
        body: { institution_name: institutionName, full_name: fullName, email, phone, address },
      });
      if (response.error) { setError("Account created but institution setup failed. Contact support."); setLoading(false); return; }
      await refreshUserData();
      navigate("/dashboard/founder");
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  };

  const handleTokenRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (!institutionToken.trim()) { setError("Institution token is required"); return; }
    setLoading(true);

    const { error: signUpError } = await signUp(email, password, fullName);
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const role = regType === "teacher" ? "TEACHER" : regType === "staff" ? "STAFF" : "STUDENT";
      const response = await supabase.functions.invoke("register-with-token", {
        body: {
          role,
          institution_token: institutionToken.trim(),
          full_name: fullName,
          email,
          phone,
          subject: regType === "teacher" ? subject : undefined,
          department: regType === "staff" ? department : undefined,
          class_name: regType === "student" ? className : undefined,
          section: regType === "student" ? section : undefined,
        },
      });

      if (response.error || !response.data?.success) {
        setError(response.data?.message || "Registration failed. Check your institution token.");
        setLoading(false);
        return;
      }

      await refreshUserData();
      const dashMap: Record<string, string> = { TEACHER: "/dashboard/teacher", STUDENT: "/dashboard/student", STAFF: "/dashboard/staff" };
      navigate(dashMap[role] || "/login");
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <img src={manexaLogo} alt="Manexa" className="h-10 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
          <p className="text-muted-foreground mb-6">
            We've sent a verification link to <span className="text-foreground font-medium">{email}</span>.
            Please verify your email then come back and log in.
          </p>
          <Link to="/login" className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-2.5 text-sm hover:bg-primary-hover transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = "w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/"><img src={manexaLogo} alt="Manexa" className="h-10 mx-auto mb-6" /></Link>
          <h1 className="text-2xl font-bold mb-2">Create an Account</h1>
          <p className="text-muted-foreground text-sm">Choose how you want to register</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive mb-4">{error}</div>
          )}

          {/* Role Selection */}
          {!regType && (
            <div className="space-y-3">
              {registrationOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => { setRegType(opt.type); setError(""); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${opt.bg}`}
                >
                  <div className={`p-3 rounded-lg ${opt.bg.split(" ")[0]}`}>
                    <opt.icon className={`w-6 h-6 ${opt.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Founder Registration */}
          {regType === "founder" && (
            <>
              <button onClick={() => { setRegType(null); setFounderStep(1); setError(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-lg font-semibold mb-1">Founder Registration</h2>
              <p className="text-xs text-muted-foreground mb-4">Step {founderStep} of 2</p>

              {founderStep === 1 ? (
                <form onSubmit={handleFounderStep1} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1.5">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={6} /></div>
                  <button type="submit" className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors">
                    Next
                  </button>
                </form>
              ) : (
                <form onSubmit={handleFounderStep2} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1.5">Institution Name</label>
                    <input type="text" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} className={inputClass} required /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Phone</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Address</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} /></div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setFounderStep(1)}
                      className="flex-1 h-10 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors">Back</button>
                    <button type="submit" disabled={loading}
                      className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                      {loading ? "Creating..." : "Create School"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Teacher Registration */}
          {regType === "teacher" && (
            <>
              <button onClick={() => { setRegType(null); setError(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-lg font-semibold mb-1">Teacher Registration</h2>
              <p className="text-xs text-muted-foreground mb-4">Join your institution with a token</p>

              <form onSubmit={handleTokenRegistration} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1.5">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required /></div>
                <div><label className="block text-sm font-medium mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required /></div>
                <div><label className="block text-sm font-medium mb-1.5">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={6} /></div>
                <div><label className="block text-sm font-medium mb-1.5">Subject / Department</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="e.g. Mathematics" /></div>
                <div><label className="block text-sm font-medium mb-1.5">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Institution Token <span className="text-destructive">*</span></label>
                  <input type="text" value={institutionToken} onChange={(e) => setInstitutionToken(e.target.value.toUpperCase())}
                    className={inputClass} required placeholder="e.g. INS-ABCD1234"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Get this token from your institution's founder/admin</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                  {loading ? "Registering..." : "Join as Teacher"}
                </button>
              </form>
            </>
          )}

          {/* Student Registration */}
          {regType === "student" && (
            <>
              <button onClick={() => { setRegType(null); setError(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-lg font-semibold mb-1">Student Registration</h2>
              <p className="text-xs text-muted-foreground mb-4">Join your institution with a token</p>

              <form onSubmit={handleTokenRegistration} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1.5">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required /></div>
                <div><label className="block text-sm font-medium mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required /></div>
                <div><label className="block text-sm font-medium mb-1.5">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={6} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium mb-1.5">Class</label>
                    <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} className={inputClass} placeholder="e.g. 10th" /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Section</label>
                    <input type="text" value={section} onChange={(e) => setSection(e.target.value)} className={inputClass} placeholder="e.g. A" /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1.5">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Institution Token <span className="text-destructive">*</span></label>
                  <input type="text" value={institutionToken} onChange={(e) => setInstitutionToken(e.target.value.toUpperCase())}
                    className={inputClass} required placeholder="e.g. INS-ABCD1234"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Get this token from your institution's founder/admin</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                  {loading ? "Registering..." : "Join as Student"}
                </button>
              </form>
            </>
          )}

          {/* Staff Registration */}
          {regType === "staff" && (
            <>
              <button onClick={() => { setRegType(null); setError(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-lg font-semibold mb-1">Staff Registration</h2>
              <p className="text-xs text-muted-foreground mb-4">Join your institution with a token</p>
              <form onSubmit={handleTokenRegistration} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1.5">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required /></div>
                <div><label className="block text-sm font-medium mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required /></div>
                <div><label className="block text-sm font-medium mb-1.5">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={6} /></div>
                <div><label className="block text-sm font-medium mb-1.5">Department</label>
                  <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} placeholder="e.g. Administration" /></div>
                <div><label className="block text-sm font-medium mb-1.5">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Institution Token <span className="text-destructive">*</span></label>
                  <input type="text" value={institutionToken} onChange={(e) => setInstitutionToken(e.target.value.toUpperCase())}
                    className={inputClass} required placeholder="e.g. INS-ABCD1234" />
                  <p className="text-xs text-muted-foreground mt-1">Get this token from your institution's founder/admin</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                  {loading ? "Registering..." : "Join as Staff"}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
