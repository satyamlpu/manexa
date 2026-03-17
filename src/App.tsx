import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FounderDashboard from "./pages/dashboard/FounderDashboard";
import PrincipalDashboard from "./pages/dashboard/PrincipalDashboard";
import TeacherDashboard from "./pages/dashboard/TeacherDashboard";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import ParentDashboard from "./pages/dashboard/ParentDashboard";
import ManageTeachers from "./pages/dashboard/ManageTeachers";
import ManageStudents from "./pages/dashboard/ManageStudents";
import ManageClasses from "./pages/dashboard/ManageClasses";
import ManageAttendance from "./pages/dashboard/ManageAttendance";
import ManageTasks from "./pages/dashboard/ManageTasks";
import ManageAnnouncements from "./pages/dashboard/ManageAnnouncements";
import ManageFees from "./pages/dashboard/ManageFees";
import ManageSalaries from "./pages/dashboard/ManageSalaries";
import Messages from "./pages/dashboard/Messages";
import Settings from "./pages/dashboard/Settings";
import FaceRegistration from "./pages/dashboard/FaceRegistration";
import FaceAttendance from "./pages/dashboard/FaceAttendance";
import StaffDashboard from "./pages/dashboard/StaffDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Founder routes */}
            <Route path="/dashboard/founder" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><FounderDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/founder/principals" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageTeachers /></ProtectedRoute>} />
            <Route path="/dashboard/founder/teachers" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageTeachers /></ProtectedRoute>} />
            <Route path="/dashboard/founder/students" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageStudents /></ProtectedRoute>} />
            <Route path="/dashboard/founder/classes" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageClasses /></ProtectedRoute>} />
            <Route path="/dashboard/founder/face-register" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><FaceRegistration /></ProtectedRoute>} />
            <Route path="/dashboard/founder/face-attendance" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><FaceAttendance /></ProtectedRoute>} />
            <Route path="/dashboard/founder/attendance" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageAttendance /></ProtectedRoute>} />
            <Route path="/dashboard/founder/tasks" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageTasks /></ProtectedRoute>} />
            <Route path="/dashboard/founder/announcements" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageAnnouncements /></ProtectedRoute>} />
            <Route path="/dashboard/founder/fees" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageFees /></ProtectedRoute>} />
            <Route path="/dashboard/founder/salaries" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><ManageSalaries /></ProtectedRoute>} />
            <Route path="/dashboard/founder/messages" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><Messages /></ProtectedRoute>} />
            <Route path="/dashboard/founder/settings" element={<ProtectedRoute allowedRoles={["FOUNDER"]}><Settings /></ProtectedRoute>} />

            {/* Principal routes */}
            <Route path="/dashboard/principal" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><PrincipalDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/principal/teachers" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><ManageTeachers /></ProtectedRoute>} />
            <Route path="/dashboard/principal/students" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><ManageStudents /></ProtectedRoute>} />
            <Route path="/dashboard/principal/face-register" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><FaceRegistration /></ProtectedRoute>} />
            <Route path="/dashboard/principal/face-attendance" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><FaceAttendance /></ProtectedRoute>} />
            <Route path="/dashboard/principal/attendance" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><ManageAttendance /></ProtectedRoute>} />
            <Route path="/dashboard/principal/announcements" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><ManageAnnouncements /></ProtectedRoute>} />
            <Route path="/dashboard/principal/messages" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><Messages /></ProtectedRoute>} />
            <Route path="/dashboard/principal/fees" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><ManageFees /></ProtectedRoute>} />

            {/* Teacher routes */}
            <Route path="/dashboard/teacher" element={<ProtectedRoute allowedRoles={["TEACHER"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/teacher/classes" element={<ProtectedRoute allowedRoles={["TEACHER"]}><ManageClasses /></ProtectedRoute>} />
            <Route path="/dashboard/teacher/face-register" element={<ProtectedRoute allowedRoles={["TEACHER"]}><FaceRegistration /></ProtectedRoute>} />
            <Route path="/dashboard/teacher/face-attendance" element={<ProtectedRoute allowedRoles={["TEACHER"]}><FaceAttendance /></ProtectedRoute>} />
            <Route path="/dashboard/teacher/attendance" element={<ProtectedRoute allowedRoles={["TEACHER"]}><ManageAttendance /></ProtectedRoute>} />
            <Route path="/dashboard/teacher/tasks" element={<ProtectedRoute allowedRoles={["TEACHER"]}><ManageTasks /></ProtectedRoute>} />
            <Route path="/dashboard/teacher/messages" element={<ProtectedRoute allowedRoles={["TEACHER"]}><Messages /></ProtectedRoute>} />

            {/* Parent routes */}
            <Route path="/dashboard/parent" element={<ProtectedRoute allowedRoles={["PARENT"]}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/parent/attendance" element={<ProtectedRoute allowedRoles={["PARENT"]}><ManageAttendance /></ProtectedRoute>} />
            <Route path="/dashboard/parent/fees" element={<ProtectedRoute allowedRoles={["PARENT"]}><ManageFees /></ProtectedRoute>} />
            <Route path="/dashboard/parent/announcements" element={<ProtectedRoute allowedRoles={["PARENT"]}><ManageAnnouncements /></ProtectedRoute>} />
            <Route path="/dashboard/parent/messages" element={<ProtectedRoute allowedRoles={["PARENT"]}><Messages /></ProtectedRoute>} />

            {/* Student routes */}
            <Route path="/dashboard/student" element={<ProtectedRoute allowedRoles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/student/face-register" element={<ProtectedRoute allowedRoles={["STUDENT"]}><FaceRegistration /></ProtectedRoute>} />
            <Route path="/dashboard/student/attendance" element={<ProtectedRoute allowedRoles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/student/tasks" element={<ProtectedRoute allowedRoles={["STUDENT"]}><ManageTasks /></ProtectedRoute>} />
            <Route path="/dashboard/student/announcements" element={<ProtectedRoute allowedRoles={["STUDENT"]}><ManageAnnouncements /></ProtectedRoute>} />

            {/* Staff routes */}
            <Route path="/dashboard/staff" element={<ProtectedRoute allowedRoles={["STAFF"]}><StaffDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/staff/tasks" element={<ProtectedRoute allowedRoles={["STAFF"]}><ManageTasks /></ProtectedRoute>} />
            <Route path="/dashboard/staff/messages" element={<ProtectedRoute allowedRoles={["STAFF"]}><Messages /></ProtectedRoute>} />
            <Route path="/dashboard/staff/attendance" element={<ProtectedRoute allowedRoles={["STAFF"]}><ManageAttendance /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
