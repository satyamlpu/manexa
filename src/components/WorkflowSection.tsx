import { motion } from "framer-motion";

const steps = [
  { num: 1, title: "Register Institution", desc: "Admin creates school profile in minutes." },
  { num: 2, title: "Add Staff & Students", desc: "Bulk upload or manual entry of all users." },
  { num: 3, title: "Assign Roles", desc: "Principal, Teacher, and Student access levels." },
  { num: 4, title: "Manage Operations", desc: "Attendance, tasks, and communication — all in one." },
  { num: 5, title: "Track & Optimize", desc: "AI-driven insights and performance reports." },
];

const WorkflowSection = () => (
  <section id="workflow" className="py-20 lg:py-28">
    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">How Manexa Works</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Get started in five simple steps. No complex setup required.</p>
      </motion.div>

      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-0">
        {/* Connecting line - desktop */}
        <div className="hidden lg:block absolute top-6 left-[10%] right-[10%] h-px bg-border" />

        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="relative flex lg:flex-col items-start lg:items-center gap-4 lg:gap-3 flex-1 text-left lg:text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg flex-shrink-0 relative z-10">
              {step.num}
            </div>
            <div>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WorkflowSection;
