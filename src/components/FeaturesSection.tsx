import { motion } from "framer-motion";
import { LayoutDashboard, ListTodo, UserCheck, MessageCircle, BrainCircuit, ShieldCheck } from "lucide-react";

const features = [
  { icon: LayoutDashboard, title: "Admin Dashboard", desc: "Full institutional oversight with real-time analytics and control." },
  { icon: ListTodo, title: "Task Management", desc: "Assign, track and manage tasks for teachers and students effortlessly." },
  { icon: UserCheck, title: "Smart Attendance", desc: "Digital attendance tracking with automated reports and alerts." },
  { icon: MessageCircle, title: "Real-Time Messaging", desc: "Broadcast announcements and direct messaging in one place." },
  { icon: BrainCircuit, title: "AI Reports", desc: "Automated progress analytics and intelligent performance insights." },
  { icon: ShieldCheck, title: "Secure Cloud System", desc: "Enterprise-grade security with encrypted, cloud-based infrastructure." },
];

const FeaturesSection = () => (
  <section id="features" className="py-20 lg:py-28 bg-card/30">
    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">One Platform. Total Control.</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Everything you need to run a modern institution, unified in one powerful platform.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
              <f.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
