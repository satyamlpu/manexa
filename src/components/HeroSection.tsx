import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center grid-pattern overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
              The Operating System for{" "}
              <span className="text-gradient-lime">Modern Schools</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mb-8 leading-relaxed">
              A Future-Ready Unified Platform Where Education Meets Intelligent Management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold px-8 py-3.5 text-base hover:bg-primary-hover transition-colors glow-lime"
              >
                Get Started
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-lg border border-border text-foreground font-semibold px-8 py-3.5 text-base hover:border-primary/50 hover:text-primary transition-colors"
              >
                Book a Demo
              </a>
            </div>
          </motion.div>

          {/* Right - Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-card rounded-2xl p-6 border border-border glow-lime">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-primary/40" />
                <div className="w-3 h-3 rounded-full bg-primary/80" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overall Attendance</span>
                  <span className="text-sm font-semibold text-primary">92%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[92%] rounded-full bg-primary" />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Active Students</p>
                    <p className="text-2xl font-bold">1,247</p>
                  </div>
                  <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
                    <p className="text-xs text-muted-foreground mb-1">Tasks Completed</p>
                    <p className="text-2xl font-bold text-secondary">89%</p>
                  </div>
                </div>

                <div className="bg-muted rounded-xl p-4 mt-4">
                  <p className="text-xs text-muted-foreground mb-3">Weekly Performance</p>
                  <div className="flex items-end gap-2 h-16">
                    {[60, 80, 45, 90, 70, 85, 95].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
