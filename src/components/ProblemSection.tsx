import { motion } from "framer-motion";
import { ClipboardList, MessageSquareOff, ListChecks, Unplug } from "lucide-react";

const problems = [
  { icon: ClipboardList, title: "Manual Attendance", desc: "Wasting hours on paper-based tracking every single day." },
  { icon: MessageSquareOff, title: "Scattered Communication", desc: "Important messages lost across WhatsApp, email and notice boards." },
  { icon: ListChecks, title: "Poor Task Tracking", desc: "No visibility into who's doing what and when it's due." },
  { icon: Unplug, title: "Disconnected Tools", desc: "Juggling multiple apps that don't talk to each other." },
];

const ProblemSection = () => (
  <section className="py-20 lg:py-28">
    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Schools Deserve Smarter Systems</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Most institutions still rely on outdated, fragmented tools. It's time for a change.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {problems.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group bg-card rounded-xl p-6 border border-border hover:border-glow-lime transition-all duration-300 hover:glow-lime"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <p.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ProblemSection;
