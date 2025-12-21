import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Sword, Globe, Zap, Star, ChevronRight, X, Target, Shield, Trophy } from "lucide-react";
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
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "completed" | "current" | "upcoming";
  progress: number;
  details: PhaseDetails;
}

const updates: Update[] = [
  {
    phase: "Phase 1",
    title: "Closed Beta",
    subtitle: "End Game Foundations",
    description: "Validate core end-game loop, identify broken progression paths, and stress test economy & balance.",
    icon: Rocket,
    status: "completed",
    progress: 100,
    details: {
      goals: ["Validate core end-game loop", "Identify broken progression paths", "Stress test economy & balance"],
      focusAreas: ["End-game activities unlocked (raids, dungeons, PvP modes)", "Gear progression caps defined", "Resource sinks introduced (upgrades, crafting, rerolls)", "Early leaderboard testing (no rewards yet)"],
      kpis: ["Retention D7 / D14", "Time to reach end game", "Meta dominance detection"],
      exitCriteria: ["No single build dominates >40%", "Economy inflation under control", "Players understand 'what to do next'"]
    }
  },
  {
    phase: "Phase 2",
    title: "Open Beta",
    subtitle: "End Game Expansion",
    description: "Test scale, observe player-driven meta, and prepare live operations infrastructure.",
    icon: Sword,
    status: "current",
    progress: 65,
    details: {
      goals: ["Test scale", "Observe player-driven meta", "Prepare live operations"],
      focusAreas: ["Full end-game loop active", "PvE + PvP reward balance", "First seasonal structure announced (no reset yet)", "Monetization soft-tested (cosmetic first)"],
      systemsAdded: ["Matchmaking improvements", "Anti-exploit & cheat detection", "Analytics dashboards"],
      exitCriteria: ["Stable servers at peak load", "Clear dominant + counter-meta cycles", "No economy-breaking exploits"]
    }
  },
  {
    phase: "Phase 3",
    title: "Soft Launch",
    subtitle: "Live Simulation",
    description: "Simulate real launch behavior, test content cadence, and measure spending without pressure.",
    icon: Globe,
    status: "upcoming",
    progress: 0,
    details: {
      goals: ["Simulate real launch behavior", "Test content cadence", "Measure spending without pressure"],
      focusAreas: ["End-game progression pacing finalized", "Daily / weekly activities tuned", "First limited-time event", "Soft seasonal rewards (titles, cosmetics)"],
      monetization: ["Battle Pass (non-pay-to-win)", "Cosmetic store", "Optional convenience items"],
      exitCriteria: ["ARPDAU within target", "No paywall complaints dominating feedback", "End-game burnout curve understood"]
    }
  },
  {
    phase: "Phase 4",
    title: "Global Launch",
    subtitle: "True End Game",
    description: "Retain, not just acquire. Establish long-term trust with the community.",
    icon: Zap,
    status: "upcoming",
    progress: 0,
    details: {
      goals: ["Retain, not just acquire", "Establish long-term trust"],
      focusAreas: [],
      launchFeatures: ["Season 1 officially starts", "Ranked PvP live", "High-tier PvE challenges", "End-game narrative hooks"],
      liveOpsPlan: ["Weekly balance patches (small)", "Monthly content drops", "Seasonal resets (partial, never full wipe)"],
      exitCriteria: ["Successful Season 1 launch", "Positive community reception", "Stable player retention metrics"]
    }
  },
  {
    phase: "Phase 5",
    title: "Evolution",
    subtitle: "Post-Launch",
    description: "Continuous evolution with new end-game modes, meta rotations, and community-driven events.",
    icon: Star,
    status: "upcoming",
    progress: 0,
    details: {
      goals: ["Continuous content evolution", "Community engagement", "Long-term game health"],
      focusAreas: [],
      ongoingSystems: ["New end-game modes", "Meta rotations", "Seasonal modifiers", "Community-driven events"],
      exitCriteria: [],
      criticalRule: "Never add power faster than players can emotionally adapt."
    }
  }
];

const PhaseModal = ({ update, isOpen, onClose }: { update: Update | null; isOpen: boolean; onClose: () => void }) => {
  if (!update) return null;
  const IconComponent = update.icon;

  const sections = [
    { title: "Goals", items: update.details.goals, icon: Target },
    { title: "Focus Areas", items: update.details.focusAreas, icon: Shield },
    { title: "KPIs", items: update.details.kpis, icon: Trophy },
    { title: "Systems Added", items: update.details.systemsAdded, icon: Zap },
    { title: "Monetization", items: update.details.monetization, icon: Star },
    { title: "Launch Features", items: update.details.launchFeatures, icon: Rocket },
    { title: "Live Ops Plan", items: update.details.liveOpsPlan, icon: Globe },
    { title: "Ongoing Systems", items: update.details.ongoingSystems, icon: Sword },
    { title: "Exit Criteria", items: update.details.exitCriteria, icon: ChevronRight },
  ].filter(s => s.items && s.items.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl max-h-[85vh] bg-gradient-to-b from-card to-card/80 border border-primary/20 rounded-3xl shadow-[0_0_60px_-15px] shadow-primary/30 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 md:p-8 border-b border-border/50">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-background/80 hover:bg-primary/20 border border-border/50 transition-all hover:scale-110"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="relative flex items-start gap-4">
                <div className={`p-4 rounded-2xl ${
                  update.status === 'completed' ? 'bg-green-500/20 shadow-green-500/20' : 
                  update.status === 'current' ? 'bg-primary/20 shadow-primary/20' : 'bg-muted'
                } shadow-lg`}>
                  <IconComponent className={`w-7 h-7 ${
                    update.status === 'completed' ? 'text-green-400' : 'text-primary'
                  }`} />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-primary font-display uppercase tracking-[0.2em] opacity-80">
                    {update.phase}
                  </span>
                  <h3 className="text-2xl font-bold font-display mt-1">{update.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{update.subtitle}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative mt-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span className="font-mono">{update.progress}%</span>
                </div>
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${update.progress}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className={`h-full rounded-full ${
                      update.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-400' : 
                      'bg-gradient-to-r from-primary to-primary/70'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[55vh] space-y-6">
              {sections.map((section, idx) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <section.icon className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-display font-bold text-primary uppercase tracking-wider">{section.title}</h4>
                  </div>
                  <div className="grid gap-2 pl-6">
                    {section.items?.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground group">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-2 group-hover:bg-primary transition-colors" />
                        <span className="group-hover:text-foreground transition-colors">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}

              {update.details.criticalRule && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-5 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary rounded-r-xl"
                >
                  <h4 className="text-xs font-display font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" /> Critical Rule
                  </h4>
                  <p className="text-sm text-foreground italic leading-relaxed">"{update.details.criticalRule}"</p>
                </motion.div>
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const completedCount = updates.filter(u => u.status === 'completed').length;
  const overallProgress = Math.round((completedCount / updates.length) * 100 + 
    (updates.find(u => u.status === 'current')?.progress || 0) / updates.length);

  return (
    <section className="py-20 md:py-32 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-display uppercase tracking-[0.2em] mb-6"
          >
            Development Journey
          </motion.span>
          <h2 className="text-3xl md:text-4xl lg:text-6xl font-bold font-display mb-4">
            Game <span className="text-primary">Roadmap</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            From Closed Beta to Global Launch — track our progress as we build the ultimate end-game experience.
          </p>

          {/* Overall Progress */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-mono text-primary font-bold">{overallProgress}%</span>
            </div>
            <div className="h-3 bg-muted/30 rounded-full overflow-hidden border border-border/50">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${overallProgress}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 rounded-full relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Phase Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          {updates.map((update, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setSelectedPhase(update)}
              className={`group relative cursor-pointer ${
                update.status === 'current' ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className={`relative h-full p-5 md:p-6 rounded-2xl border transition-all duration-500 ${
                update.status === 'completed' 
                  ? 'bg-gradient-to-b from-green-500/10 to-card border-green-500/30 hover:border-green-500/50' 
                  : update.status === 'current'
                  ? 'bg-gradient-to-b from-primary/15 to-card border-primary/40 hover:border-primary shadow-lg shadow-primary/10'
                  : 'bg-gradient-to-b from-muted/30 to-card border-border/50 hover:border-primary/30'
              } ${hoveredIndex === index ? 'scale-[1.02]' : ''}`}>
                
                {/* Status Indicator */}
                <div className="absolute -top-2 -right-2">
                  {update.status === 'completed' && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <svg className="w-3 h-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {update.status === 'current' && (
                    <div className="w-6 h-6 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/30" />
                  )}
                </div>

                {/* Phase Number */}
                <span className={`text-[10px] font-display uppercase tracking-[0.15em] ${
                  update.status === 'completed' ? 'text-green-400' : 
                  update.status === 'current' ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {update.phase}
                </span>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center my-4 transition-all duration-300 ${
                  update.status === 'completed' 
                    ? 'bg-green-500/20 group-hover:bg-green-500/30' 
                    : update.status === 'current'
                    ? 'bg-primary/20 group-hover:bg-primary/30'
                    : 'bg-muted/50 group-hover:bg-muted'
                }`}>
                  <update.icon className={`w-6 h-6 ${
                    update.status === 'completed' ? 'text-green-400' : 
                    update.status === 'current' ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>

                {/* Title */}
                <h3 className="font-display font-bold text-lg mb-1">{update.title}</h3>
                <p className={`text-xs mb-3 ${
                  update.status === 'current' ? 'text-primary/80' : 'text-muted-foreground'
                }`}>{update.subtitle}</p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${update.progress}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                      className={`h-full rounded-full ${
                        update.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block font-mono">
                    {update.progress}% Complete
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                  {update.description}
                </p>

                {/* CTA */}
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium transition-all ${
                  update.status === 'completed' ? 'text-green-400 group-hover:text-green-300' : 
                  update.status === 'current' ? 'text-primary group-hover:text-primary/80' : 
                  'text-muted-foreground group-hover:text-foreground'
                }`}>
                  View Details
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>

                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 pointer-events-none ${
                  hoveredIndex === index ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className={`absolute inset-0 rounded-2xl ${
                    update.status === 'completed' ? 'shadow-[inset_0_0_30px_rgba(34,197,94,0.1)]' :
                    update.status === 'current' ? 'shadow-[inset_0_0_30px_rgba(var(--primary),0.1)]' :
                    'shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]'
                  }`} />
                </div>
              </div>

              {/* Connection Line (Desktop) */}
              {index < updates.length - 1 && (
                <div className="hidden xl:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-border to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <PhaseModal update={selectedPhase} isOpen={!!selectedPhase} onClose={() => setSelectedPhase(null)} />
    </section>
  );
};
