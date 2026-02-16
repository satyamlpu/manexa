import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, roles, primaryRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !roles.some(r => allowedRoles.includes(r))) {
    // Redirect to their own dashboard
    const dashMap: Record<string, string> = {
      FOUNDER: "/dashboard/founder",
      PRINCIPAL: "/dashboard/principal",
      TEACHER: "/dashboard/teacher",
      PARENT: "/dashboard/parent",
      STUDENT: "/dashboard/student",
    };
    return <Navigate to={dashMap[primaryRole || ""] || "/login"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
