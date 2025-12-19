import { motion } from "framer-motion";
import { Megaphone, Sparkles, Wrench, Gift, ExternalLink } from "lucide-react";

const announcements = [
  {
    icon: Sparkles,
    title: "Halloween Event Started",
    description: "New limited-time dungeon available with exclusive rewards and costumes are now available in the shop.",
    date: "2 hours ago",
  },
  {
    icon: Wrench,
    title: "Server Maintenance Complete",
    description: "Stability improvements for the Gate Dungeon have been successfully deployed to all servers.",
    date: "1 day ago",
  },
  {
    icon: Gift,
    title: "PvP Tournament Rewards!",
    description: "Top players from the arena tournament can now claim their exclusive prizes.",
    date: "3 days ago",
  },
  {
    icon: Megaphone,
    title: "Double XP Weekend",
    description: "Get 2x experience this weekend on all monsters and dungeons for the next...",
    date: "5 days ago",
  },
];

export const AnnouncementsCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <span className="text-sm font-display font-semibold">Announcements</span>
        </div>
        <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          View All <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {announcements.map((item, index) => (
          <div
            key={index}
            className="p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-foreground mb-0.5">
                  {item.title}
                </h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
                <span className="text-[9px] text-muted-foreground/60 mt-1 block">
                  {item.date}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
