import { motion } from "framer-motion";
import { ScrollText, Plus, Minus, ChevronRight } from "lucide-react";

const changelog = [
  {
    version: "v3.2.1",
    type: "patch",
    changes: [
      { type: "add", text: "Passive skill notification" },
      { type: "add", text: "Hit marker & character title" },
      { type: "fix", text: "Added Ordiline Assassin chat commands for char management" },
    ],
    date: "Dec 15",
  },
  {
    version: "v3.2.0",
    type: "update",
    changes: [
      { type: "add", text: "Added new Halloween Dungeon" },
      { type: "add", text: "Pet System Enhancement (25 new pets)" },
      { type: "fix", text: "Gold dupe bug in marketplace" },
    ],
    date: "Dec 10",
  },
];

export const ChangelogCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <span className="text-sm font-display font-semibold">Changelog</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Latest Updates</span>
      </div>

      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
        {changelog.map((entry, index) => (
          <div key={index} className="border-l-2 border-primary/30 pl-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-display font-bold text-primary">{entry.version}</span>
              <span className="text-[9px] text-muted-foreground">{entry.date}</span>
            </div>
            <ul className="space-y-1">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                  {change.type === "add" ? (
                    <Plus className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <Minus className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="line-clamp-1">{change.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <a href="#" className="flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80 mt-3 pt-3 border-t border-border/50 transition-colors">
        View Full Changelog <ChevronRight className="w-3 h-3" />
      </a>
    </motion.div>
  );
};
