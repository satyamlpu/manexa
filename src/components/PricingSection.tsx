import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    desc: "For small schools getting started.",
    features: ["Up to 100 students", "Basic attendance", "Task management", "Email support"],
    highlighted: false,
  },
  {
    name: "Professional",
    price: "₹999/mo",
    desc: "For growing institutions.",
    features: ["Unlimited students", "AI reports & analytics", "Real-time messaging", "Priority support", "Custom branding"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For multi-campus organizations.",
    features: ["Multi-institution support", "Advanced API access", "Dedicated account manager", "SLA guarantee", "SSO & RBAC"],
    highlighted: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-20 lg:py-28 bg-card/30">
    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Start free. Scale as you grow. No hidden fees.</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-2xl p-8 border ${
              plan.highlighted
                ? "bg-card border-primary/40 glow-lime-strong"
                : "bg-card border-border"
            }`}
          >
            <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
            <p className="text-3xl font-bold mb-6">{plan.price}</p>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#"
              className={`block text-center rounded-lg font-semibold text-sm py-3 transition-colors ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                  : "border border-border text-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {plan.name === "Enterprise" ? "Contact Sales" : "Start Free Trial"}
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
