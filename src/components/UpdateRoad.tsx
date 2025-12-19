import { motion } from "framer-motion";
import { Rocket, Sword, Globe, ChevronRight } from "lucide-react";

const updates = [
  {
    phase: "Phase 1",
    title: "Beta Server Launch",
    description: "Initial Server Launch with basic War 1 Kill Raid/Dungeon & Battleground content. Core mechanics stable.",
    icon: Rocket,
    status: "completed",
    image: null,
  },
  {
    phase: "Phase 2",
    title: "Shadow Assassin Update",
    description: "New Shadow Hiding Dungeon class. Shadow Assassin class/classes+. Pet System Enhancements. Skills overhaul.",
    icon: Sword,
    status: "current",
    image: null,
  },
  {
    phase: "Phase 3",
    title: "World Expansion",
    description: "Server Wide Expansion to Two new Realms. Four new Dungeon/Raid Zones added. Cap increase to 95.",
    icon: Globe,
    status: "upcoming",
    image: null,
  },
];

export const UpdateRoad = () => {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="text-primary text-xs md:text-sm font-display uppercase tracking-widest mb-4 block">
            Roadmap
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold font-display mb-4">
            Update Road
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto px-2">
            Follow our development journey. Here's what we have planned for the future of WOI Endgame.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-border" />

            {/* Timeline Items */}
            <div className="space-y-6 md:space-y-8">
              {updates.map((update, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="relative pl-10 md:pl-16"
                >
                  {/* Timeline Dot */}
                  <div className={`absolute left-2 md:left-4 top-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 ${
                    update.status === 'completed' 
                      ? 'bg-primary border-primary' 
                      : update.status === 'current'
                      ? 'bg-primary/50 border-primary animate-pulse'
                      : 'bg-card border-border'
                  }`}>
                    {update.status === 'completed' && (
                      <div className="w-full h-full rounded-full bg-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="glass-card p-4 md:p-5 group hover:border-primary/50 transition-all">
                    <span className="text-[9px] md:text-[10px] text-primary font-display uppercase tracking-widest mb-1 md:mb-2 block">
                      {update.phase}
                    </span>
                    <h3 className="font-display font-bold text-sm md:text-lg mb-1 md:mb-2 flex items-center gap-2">
                      <update.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      {update.title}
                    </h3>
                    <p className="text-[10px] md:text-sm text-muted-foreground leading-relaxed">
                      {update.description}
                    </p>
                    {update.status !== 'upcoming' && (
                      <a href="#" className="inline-flex items-center gap-1 text-[10px] md:text-xs text-primary mt-2 md:mt-3 hover:gap-2 transition-all">
                        Learn More <ChevronRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
