import { motion } from "framer-motion";

const CTASection = () => (
  <section className="py-20 lg:py-28">
    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Transform Your Institution?
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">
          Start your digital transformation today with Manexa.
        </p>
        <a
          href="#"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold px-10 py-4 text-base hover:bg-primary-hover transition-colors glow-lime"
        >
          Get Started Now
        </a>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
