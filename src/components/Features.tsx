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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5 },
  },
};

export const Features = () => {
  return (
    <section id="features" className="py-16 md:py-24 px-4 bg-card/30 scroll-mt-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="text-primary text-xs md:text-sm font-display uppercase tracking-widest mb-4 block">
            Why Choose Us
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold font-display">
            Key Features
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="glass-card p-4 md:p-6 text-center group hover:border-primary/50 transition-all duration-300"
            >
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 md:w-7 md:h-7 text-primary" />
              </div>
              <h3 className="text-sm md:text-lg font-bold font-display mb-1 md:mb-2">
                {feature.title}
              </h3>
              <p className="text-[10px] md:text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
