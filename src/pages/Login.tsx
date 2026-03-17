import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import manexaLogo from "@/assets/manexa-logo.svg";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, primaryRole, user, roles } = useAuth();
  const navigate = useNavigate();

  const dashMap: Record<string, string> = {
    FOUNDER: "/dashboard/founder",
    PRINCIPAL: "/dashboard/principal",
    TEACHER: "/dashboard/teacher",
    PARENT: "/dashboard/parent",
    STUDENT: "/dashboard/student",
    STAFF: "/dashboard/staff",
  };

  useEffect(() => {
    if (user && roles.length > 0 && primaryRole) {
      navigate(dashMap[primaryRole] || "/dashboard/founder", { replace: true });
    }
  }, [user, roles, primaryRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast({ title: "Missing fields", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes("invalid login")) {
        toast({ title: "Invalid credentials", description: "Email or password is incorrect. Please try again.", variant: "destructive" });
      } else if (msg.includes("email not confirmed")) {
        toast({ title: "Email not verified", description: "Please check your inbox and verify your email before signing in.", variant: "destructive" });
      } else if (msg.includes("rate") || msg.includes("too many")) {
        toast({ title: "Too many attempts", description: "Please wait a moment before trying again.", variant: "destructive" });
      } else {
        toast({ title: "Sign in failed", description: signInError.message, variant: "destructive" });
      }
      setLoading(false);
      return;
    }

    toast({ title: "Welcome back!", description: "Redirecting to your dashboard..." });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img src={manexaLogo} alt="Manexa" className="h-10 mx-auto mb-6 hover:opacity-80 transition-opacity" />
          </Link>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Password</label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign In"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">Register your school</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
