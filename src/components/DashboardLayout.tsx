import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import manexaLogo from "@/assets/manexa-logo.svg";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  ListTodo, Megaphone, LogOut, Menu, X, School, IndianRupee, Wallet, MessageSquare, Settings, ScanFace, UserCheck
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const roleNavItems: Record<string, NavItem[]> = {
  FOUNDER: [
    { label: "Dashboard", href: "/dashboard/founder", icon: LayoutDashboard },
    { label: "Principals", href: "/dashboard/founder/principals", icon: Users },
    { label: "Teachers", href: "/dashboard/founder/teachers", icon: Users },
    { label: "Students", href: "/dashboard/founder/students", icon: GraduationCap },
    { label: "Classes", href: "/dashboard/founder/classes", icon: BookOpen },
    { label: "Face Register", href: "/dashboard/founder/face-register", icon: UserCheck },
    { label: "Face Attendance", href: "/dashboard/founder/face-attendance", icon: ScanFace },
    { label: "Attendance", href: "/dashboard/founder/attendance", icon: ClipboardCheck },
    { label: "Tasks", href: "/dashboard/founder/tasks", icon: ListTodo },
    { label: "Fees", href: "/dashboard/founder/fees", icon: IndianRupee },
    { label: "Salaries", href: "/dashboard/founder/salaries", icon: Wallet },
    { label: "Announcements", href: "/dashboard/founder/announcements", icon: Megaphone },
    { label: "Messages", href: "/dashboard/founder/messages", icon: MessageSquare },
    { label: "Settings", href: "/dashboard/founder/settings", icon: Settings },
  ],
  PRINCIPAL: [
    { label: "Dashboard", href: "/dashboard/principal", icon: LayoutDashboard },
    { label: "Teachers", href: "/dashboard/principal/teachers", icon: Users },
    { label: "Students", href: "/dashboard/principal/students", icon: GraduationCap },
    { label: "Attendance", href: "/dashboard/principal/attendance", icon: ClipboardCheck },
    { label: "Fees", href: "/dashboard/principal/fees", icon: IndianRupee },
    { label: "Announcements", href: "/dashboard/principal/announcements", icon: Megaphone },
    { label: "Messages", href: "/dashboard/principal/messages", icon: MessageSquare },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/dashboard/teacher", icon: LayoutDashboard },
    { label: "My Classes", href: "/dashboard/teacher/classes", icon: BookOpen },
    { label: "Attendance", href: "/dashboard/teacher/attendance", icon: ClipboardCheck },
    { label: "Tasks", href: "/dashboard/teacher/tasks", icon: ListTodo },
    { label: "Messages", href: "/dashboard/teacher/messages", icon: MessageSquare },
  ],
  PARENT: [
    { label: "Dashboard", href: "/dashboard/parent", icon: LayoutDashboard },
    { label: "Attendance", href: "/dashboard/parent/attendance", icon: ClipboardCheck },
    { label: "Fees", href: "/dashboard/parent/fees", icon: IndianRupee },
    { label: "Announcements", href: "/dashboard/parent/announcements", icon: Megaphone },
    { label: "Messages", href: "/dashboard/parent/messages", icon: MessageSquare },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/dashboard/student", icon: LayoutDashboard },
    { label: "Attendance", href: "/dashboard/student/attendance", icon: ClipboardCheck },
    { label: "Tasks", href: "/dashboard/student/tasks", icon: ListTodo },
    { label: "Announcements", href: "/dashboard/student/announcements", icon: Megaphone },
  ],
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, primaryRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = roleNavItems[primaryRole || "FOUNDER"] || [];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/">
              <img src={manexaLogo} alt="Manexa" className="h-12 w-auto" />
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground">{primaryRole}</p>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{primaryRole} Dashboard</span>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
