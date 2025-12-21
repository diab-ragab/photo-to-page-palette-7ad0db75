import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Sword, Globe, Zap, Star, ChevronRight, X } from "lucide-react";
import { useState } from "react";

interface PhaseDetails {
  goals: string[];
  focusAreas: string[];
  kpis?: string[];
  systemsAdded?: string[];
  monetization?: string[];
  exitCriteria: string[];
  launchFeatures?: string[];
  liveOpsPlan?: string[];
  ongoingSystems?: string[];
  criticalRule?: string;
}

interface Update {
  phase: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "completed" | "current" | "upcoming";
  details: PhaseDetails;
}

const updates: Update[] = [
  {
    phase: "Phase 1",
    title: "Closed Beta – End Game Foundations",
    description: "Validate core end-game loop, identify broken progression paths, and stress test economy & balance.",
    icon: Rocket,
    status: "completed",
    details: {
      goals: [
        "Validate core end-game loop",
        "Identify broken progression paths",
        "Stress test economy & balance"
      ],
      focusAreas: [
        "End-game activities unlocked (raids, dungeons, PvP modes)",
        "Gear progression caps defined",
        "Resource sinks introduced (upgrades, crafting, rerolls)",
        "Early leaderboard testing (no rewards yet)"
      ],
      kpis: [
        "Retention D7 / D14",
        "Time to reach end game",
        "Meta dominance detection"
      ],
      exitCriteria: [
        "No single build dominates >40%",
        "Economy inflation under control",
        "Players understand 'what to do next'"
      ]
    }
  },
  {
    phase: "Phase 2",
    title: "Open Beta – End Game Expansion",
    description: "Test scale, observe player-driven meta, and prepare live operations infrastructure.",
    icon: Sword,
    status: "current",
    details: {
      goals: [
        "Test scale",
        "Observe player-driven meta",
        "Prepare live operations"
      ],
      focusAreas: [
        "Full end-game loop active",
        "PvE + PvP reward balance",
        "First seasonal structure announced (no reset yet)",
        "Monetization soft-tested (cosmetic first)"
      ],
      systemsAdded: [
        "Matchmaking improvements",
        "Anti-exploit & cheat detection",
        "Analytics dashboards"
      ],
      exitCriteria: [
        "Stable servers at peak load",
        "Clear dominant + counter-meta cycles",
        "No economy-breaking exploits"
      ]
    }
  },
  {
    phase: "Phase 3",
    title: "Soft Launch – Live Simulation",
    description: "Simulate real launch behavior, test content cadence, and measure spending without pressure.",
    icon: Globe,
    status: "upcoming",
    details: {
      goals: [
        "Simulate real launch behavior",
        "Test content cadence",
        "Measure spending without pressure"
      ],
      focusAreas: [
        "End-game progression pacing finalized",
        "Daily / weekly activities tuned",
        "First limited-time event",
        "Soft seasonal rewards (titles, cosmetics)"
      ],
      monetization: [
        "Battle Pass (non-pay-to-win)",
        "Cosmetic store",
        "Optional convenience items"
      ],
      exitCriteria: [
        "ARPDAU within target",
        "No paywall complaints dominating feedback",
        "End-game burnout curve understood"
      ]
    }
  },
  {
    phase: "Phase 4",
    title: "Global Launch – True End Game",
    description: "Retain, not just acquire. Establish long-term trust with the community.",
    icon: Zap,
    status: "upcoming",
    details: {
      goals: [
        "Retain, not just acquire",
        "Establish long-term trust"
      ],
      focusAreas: [],
      launchFeatures: [
        "Season 1 officially starts",
        "Ranked PvP live",
        "High-tier PvE challenges",
        "End-game narrative hooks"
      ],
      liveOpsPlan: [
        "Weekly balance patches (small)",
        "Monthly content drops",
        "Seasonal resets (partial, never full wipe)"
      ],
      exitCriteria: [
        "Successful Season 1 launch",
        "Positive community reception",
        "Stable player retention metrics"
      ]
    }
  },
  {
    phase: "Phase 5",
    title: "Post-Launch Evolution",
    description: "Continuous evolution with new end-game modes, meta rotations, and community-driven events.",
    icon: Star,
    status: "upcoming",
    details: {
      goals: [
        "Continuous content evolution",
        "Community engagement",
        "Long-term game health"
      ],
      focusAreas: [],
      ongoingSystems: [
        "New end-game modes",
        "Meta rotations",
        "Seasonal modifiers",
        "Community-driven events"
      ],
      exitCriteria: [],
      criticalRule: "Never add power faster than players can emotionally adapt."
    }
  }
];

const PhaseModal = ({ 
  update, 
  isOpen, 
  onClose 
}: { 
  update: Update | null; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  if (!update) return null;

  const IconComponent = update.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-primary/20 to-primary/5 p-6 border-b border-border">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  update.status === 'completed' 
                    ? 'bg-primary/20' 
                    : update.status === 'current'
                    ? 'bg-primary/30'
                    : 'bg-muted'
                }`}>
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-primary font-display uppercase tracking-widest">
                    {update.phase}
                  </span>
                  <h3 className="text-xl font-bold font-display">{update.title}</h3>
                </div>
              </div>
              <div className="mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  update.status === 'completed' 
                    ? 'bg-green-500/20 text-green-400' 
                    : update.status === 'current'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {update.status === 'completed' ? '✓ Completed' : update.status === 'current' ? '● In Progress' : '○ Upcoming'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {/* Goals */}
              {update.details.goals.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">Goals</h4>
                  <ul className="space-y-2">
                    {update.details.goals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Focus Areas */}
              {update.details.focusAreas.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">Focus Areas</h4>
                  <ul className="space-y-2">
                    {update.details.focusAreas.map((area, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* KPIs */}
              {update.details.kpis && update.details.kpis.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">KPIs</h4>
                  <ul className="space-y-2">
                    {update.details.kpis.map((kpi, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {kpi}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Systems Added */}
              {update.details.systemsAdded && update.details.systemsAdded.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">Systems Added</h4>
                  <ul className="space-y-2">
                    {update.details.systemsAdded.map((system, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {system}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Monetization */}
              {update.details.monetization && update.details.monetization.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">Monetization</h4>
                  <ul className="space-y-2">
                    {update.details.monetization.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Launch Features */}
              {update.details.launchFeatures && update.details.launchFeatures.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">Launch Features</h4>
                  <ul className="space-y-2">
                    {update.details.launchFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Live Ops Plan */}
              {update.details.liveOpsPlan && update.details.liveOpsPlan.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">Live Ops Plan</h4>
                  <ul className="space-y-2">
                    {update.details.liveOpsPlan.map((plan, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {plan}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ongoing Systems */}
              {update.details.ongoingSystems && update.details.ongoingSystems.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">Ongoing Systems</h4>
                  <ul className="space-y-2">
                    {update.details.ongoingSystems.map((system, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {system}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exit Criteria */}
              {update.details.exitCriteria.length > 0 && (
                <div>
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-3">Exit Criteria</h4>
                  <ul className="space-y-2">
                    {update.details.exitCriteria.map((criteria, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical Rule */}
              {update.details.criticalRule && (
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                  <h4 className="text-sm font-display font-bold text-primary uppercase tracking-wider mb-2">Critical Rule</h4>
                  <p className="text-sm text-foreground italic">"{update.details.criticalRule}"</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const UpdateRoad = () => {
  const [selectedPhase, setSelectedPhase] = useState<Update | null>(null);

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
            Development Roadmap
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto px-2">
            Follow our development journey from Closed Beta to Global Launch and beyond.
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
                  transition={{ duration: 0.5, delay: index * 0.1 }}
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
                    <button 
                      onClick={() => setSelectedPhase(update)}
                      className="inline-flex items-center gap-1 text-[10px] md:text-xs text-primary mt-2 md:mt-3 hover:gap-2 transition-all cursor-pointer"
                    >
                      Learn More <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phase Detail Modal */}
      <PhaseModal 
        update={selectedPhase} 
        isOpen={!!selectedPhase} 
        onClose={() => setSelectedPhase(null)} 
      />
    </section>
  );
};
