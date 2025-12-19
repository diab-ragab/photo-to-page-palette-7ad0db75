import { motion } from "framer-motion";
import { Shield, Gift, Swords, Users } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Custom Rates",
    description: "Play at your own pace with adjustable experience rates and drop chances.",
  },
  {
    icon: Gift,
    title: "Exclusive Content",
    description: "Access exclusive items, dungeons, and events not found anywhere else.",
  },
  {
    icon: Swords,
    title: "Enhanced PvP & PvE",
    description: "Balanced combat system with challenging bosses and competitive arenas.",
  },
  {
    icon: Users,
    title: "Active Community",
    description: "Join a welcoming, active player base with 24/7 support and events.",
  },
];

export const Features = () => {
  return (
    <section className="py-24 px-4 bg-card/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-display uppercase tracking-widest mb-4 block">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display">
            Key Features
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 text-center group hover:border-primary/50 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold font-display mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
