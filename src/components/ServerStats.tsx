import { motion } from "framer-motion";
import { Gamepad2, Users, Swords, MessageSquare } from "lucide-react";

const stats = [
  { icon: Users, value: "854", label: "Players", sublabel: "Online" },
  { icon: Gamepad2, value: "4d 12h", label: "Uptime", sublabel: "99.9%" },
  { icon: Swords, value: "2,845", label: "Accounts", sublabel: "Registered" },
  { icon: MessageSquare, value: "120", label: "Discord", sublabel: "Active" },
];

export const ServerStats = () => {
  return (
    <section className="relative z-30 -mt-20 px-4">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 text-center group hover:border-primary/50 transition-all duration-300"
            >
              <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-3xl font-bold font-display text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
              <div className="text-xs text-primary mt-1">
                {stat.sublabel}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
