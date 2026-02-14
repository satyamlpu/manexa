import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, GraduationCap, Users } from "lucide-react";

const tabs = [
  { id: "admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { id: "teacher", label: "Teacher Dashboard", icon: Users },
  { id: "student", label: "Student Panel", icon: GraduationCap },
];

const AdminPanel = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Total Students", value: "2,847", change: "+12%" },
        { label: "Staff Members", value: "184", change: "+3%" },
        { label: "Attendance Rate", value: "94.2%", change: "+1.8%" },
      ].map((s) => (
        <div key={s.label} className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
          <p className="text-xl font-bold">{s.value}</p>
          <p className="text-xs text-primary mt-1">{s.change}</p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-muted rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-3">Revenue Overview</p>
        <div className="flex items-end gap-1.5 h-20">
          {[40, 65, 50, 80, 60, 90, 75, 95, 70, 85, 92, 88].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-primary/60" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="bg-muted rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-3">Recent Activity</p>
        <div className="space-y-2.5">
          {["New admission: Rahul S.", "Fee payment received", "Staff meeting at 3 PM"].map((a) => (
            <div key={a} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TeacherPanel = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "My Classes", value: "6" },
        { label: "Pending Tasks", value: "12" },
        { label: "Avg. Score", value: "78%" },
      ].map((s) => (
        <div key={s.label} className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
          <p className="text-xl font-bold">{s.value}</p>
        </div>
      ))}
    </div>
    <div className="bg-muted rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-3">Today's Schedule</p>
      <div className="space-y-3">
        {[
          { time: "9:00 AM", cls: "Mathematics — Class 10A" },
          { time: "10:30 AM", cls: "Physics — Class 12B" },
          { time: "1:00 PM", cls: "Science — Class 8C" },
        ].map((s) => (
          <div key={s.time} className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">{s.time}</span>
            <span className="text-xs text-muted-foreground">{s.cls}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">Announcement</p>
      <p className="text-sm">Parent-teacher meeting scheduled for Friday.</p>
    </div>
  </div>
);

const StudentPanel = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Attendance", value: "96%" },
        { label: "Assignments Due", value: "3" },
        { label: "GPA", value: "3.8" },
      ].map((s) => (
        <div key={s.label} className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
          <p className="text-xl font-bold">{s.value}</p>
        </div>
      ))}
    </div>
    <div className="bg-muted rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-3">Upcoming Assignments</p>
      <div className="space-y-3">
        {[
          { subject: "Mathematics", due: "Tomorrow" },
          { subject: "English Essay", due: "Feb 18" },
          { subject: "Science Project", due: "Feb 22" },
        ].map((a) => (
          <div key={a.subject} className="flex items-center justify-between">
            <span className="text-sm">{a.subject}</span>
            <span className="text-xs text-primary font-medium">{a.due}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="bg-muted rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-2">This Term Progress</p>
      <div className="w-full h-2.5 rounded-full bg-background overflow-hidden">
        <div className="h-full w-[76%] rounded-full bg-primary" />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">76% completed</p>
    </div>
  </div>
);

const panels: Record<string, React.FC> = { admin: AdminPanel, teacher: TeacherPanel, student: StudentPanel };

const DashboardPreview = () => {
  const [active, setActive] = useState("admin");
  const Panel = panels[active];

  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See Manexa in Action</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">A clean, intuitive interface for every role — everything accessible from one sidebar.</p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 justify-center flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-6 glow-lime"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-primary/40" />
              <div className="w-3 h-3 rounded-full bg-primary/80" />
              <span className="ml-3 text-xs text-muted-foreground">{tabs.find((t) => t.id === active)?.label}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <Panel />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
