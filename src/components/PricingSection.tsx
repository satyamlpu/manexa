import { motion } from "framer-motion";
import { Check, Star, Zap, Building2, Rocket } from "lucide-react";

const PricingSection = () => (
  <section id="pricing" className="py-20 lg:py-28 bg-card/30 relative overflow-hidden">
    {/* Background glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
    </div>

    <div className="container mx-auto px-4 lg:px-8 relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-6"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          No hidden fees. No long-term contracts. Data ownership remains with your school.
        </p>
      </motion.div>

      {/* Early Adopter Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex justify-center mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary text-sm font-semibold px-5 py-2.5 rounded-full">
          <Zap className="w-4 h-4" />
          🎉 Early Adopter Offer — Lock ₹29/student for 2 Years. Limited seats.
        </div>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">

        {/* STARTER */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0 }}
          className="rounded-2xl p-8 border border-border bg-card flex flex-col"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Rocket className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Starter</span>
          </div>

          <h3 className="text-xl font-bold mb-1">Perfect for Small Schools Getting Digital</h3>
          <p className="text-sm text-muted-foreground mb-5">Ideal for institutions with up to 200 students.</p>

          <div className="mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">₹0</span>
              <span className="text-muted-foreground text-sm">for 30 days</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Then <span className="text-foreground font-semibold">₹15 / student / month</span></p>
          </div>

          <div className="h-px bg-border my-5" />

          <ul className="space-y-2.5 flex-1 mb-5">
            {[
              "Up to 200 Students",
              "Attendance System",
              "Basic Task Management",
              "Parent Login",
              "Founder Mini Dashboard",
              "WhatsApp Notifications (Limited)",
              "Email Support",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 mb-6">
            <p className="text-xs font-semibold text-primary mb-1">🎁 Free Bonus</p>
            <p className="text-xs text-muted-foreground">Free onboarding session (1 hour)</p>
          </div>

          <a
            href="#"
            className="block text-center rounded-lg font-semibold text-sm py-3 border border-border text-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            Start 30-Day Free Pilot
          </a>
        </motion.div>

        {/* PROFESSIONAL */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-8 border-2 border-primary/50 bg-card flex flex-col relative shadow-[0_0_40px_-8px_hsl(var(--primary)/0.35)] scale-[1.03]"
        >
          {/* Badges */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
              🔥 Most Popular
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3 mt-2">
            <div className="p-2 rounded-lg bg-primary/15">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Professional</span>
          </div>

          <h3 className="text-xl font-bold mb-1">Full Founder Control System</h3>
          <p className="text-sm text-muted-foreground mb-5">Everything you need to run a modern institution.</p>

          <div className="mb-2 space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">₹29</span>
              <span className="text-muted-foreground text-sm">/ student / month</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">₹299</span>
              <span className="text-muted-foreground text-sm">/ teacher / month</span>
            </div>
            <p className="text-xs text-muted-foreground">Min. billing ₹7,500/month · Pay only for active users</p>
          </div>

          <div className="h-px bg-border my-5" />

          <ul className="space-y-2.5 flex-1 mb-5">
            {[
              "Unlimited Students",
              "Unlimited Teachers",
              "Full Founder Analytics Dashboard",
              "AI Attendance Trends",
              "Fee Management",
              "Real-Time Messaging",
              "Parent Portal",
              "Role-Based Access Control",
              "PG–12 Class Structure",
              "Task & Assignment System",
              "Reports & PDF Exports",
              "Priority Support",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 mb-6">
            <p className="text-xs font-semibold text-primary mb-1.5">🎁 Free Bonuses Included</p>
            <ul className="space-y-1">
              {["Free data migration", "Free training for staff", "Custom school branding"].map((b) => (
                <li key={b} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-primary flex-shrink-0" />{b}
                </li>
              ))}
            </ul>
          </div>

          <a
            href="#"
            className="block text-center rounded-lg font-semibold text-sm py-3.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Start Free Trial
          </a>
          <p className="text-center text-xs text-muted-foreground mt-2.5">⭐ Most Chosen by Growing Schools</p>
        </motion.div>

        {/* ENTERPRISE */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-8 border border-border bg-card flex flex-col"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Building2 className="w-4 h-4 text-secondary" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Enterprise</span>
          </div>

          <h3 className="text-xl font-bold mb-1">For Multi-Campus & Franchise Schools</h3>
          <p className="text-sm text-muted-foreground mb-5">Tailored for large institutions with complex needs.</p>

          <div className="mb-2">
            <span className="text-4xl font-bold">Custom</span>
            <p className="text-sm text-muted-foreground mt-1">Pricing based on your scale & requirements</p>
          </div>

          <div className="h-px bg-border my-5" />

          <ul className="space-y-2.5 flex-1 mb-5">
            {[
              "Multi-Branch Control",
              "Centralized Founder Dashboard",
              "Franchise Monitoring",
              "Advanced Analytics",
              "Dedicated Account Manager",
              "API Access",
              "White-Label Option",
              "SSO Integration",
              "SLA Guarantee",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-secondary/10 border border-border px-4 py-3 mb-6">
            <p className="text-xs font-semibold text-foreground mb-1.5">🎁 Premium Onboarding</p>
            <ul className="space-y-1">
              {["On-site onboarding support", "Custom feature development"].map((b) => (
                <li key={b} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-primary flex-shrink-0" />{b}
                </li>
              ))}
            </ul>
          </div>

          <a
            href="#"
            className="block text-center rounded-lg font-semibold text-sm py-3 border border-border text-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            Book Strategy Call
          </a>
        </motion.div>
      </div>

      {/* Trust footer */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center mt-12 space-y-1"
      >
        <p className="text-sm text-muted-foreground">No long-term contracts. Cancel anytime.</p>
        <p className="text-sm text-muted-foreground">Data ownership remains with your school.</p>
      </motion.div>
    </div>
  </section>
);

export default PricingSection;
