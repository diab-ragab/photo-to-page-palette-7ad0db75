import { motion } from "framer-motion";
import { MessageCircle, ExternalLink, Megaphone, Sparkles, Wrench, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const announcements = [
  {
    icon: Sparkles,
    title: "Halloween Event Started",
    description: "New limited-time dungeon available with exclusive rewards and costumes!",
    date: "2 hours ago",
    type: "event",
  },
  {
    icon: Wrench,
    title: "Server Maintenance Complete",
    description: "Stability improvements and bug fixes applied. Thank you for your patience.",
    date: "1 day ago",
    type: "maintenance",
  },
  {
    icon: Gift,
    title: "PvP Tournament Rewards!",
    description: "Top players from the arena event can now claim their rewards.",
    date: "3 days ago",
    type: "reward",
  },
  {
    icon: Megaphone,
    title: "Double XP Weekend",
    description: "Get 2x experience this weekend on all monsters and dungeons.",
    date: "5 days ago",
    type: "announcement",
  },
];

export const DiscordWidget = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto mt-12"
    >
      {/* Announcements Card */}
      <div className="glass-card p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider">Announcements</h3>
          </div>
          <span className="text-xs text-muted-foreground">View All</span>
        </div>
        
        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
          {announcements.map((item, index) => (
            <div
              key={index}
              className="flex gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                  {item.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discord Card */}
      <div className="glass-card p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm">Discord</h3>
            <p className="text-xs text-muted-foreground">Community Server</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center py-4">
            <div className="text-4xl font-bold font-display text-foreground mb-1">
              15,403
            </div>
            <p className="text-sm text-muted-foreground">Members</p>
          </div>

          <div className="flex items-center justify-center gap-6 py-3 border-y border-border/50 my-3">
            <div className="text-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-lg font-bold font-display">854</span>
              </div>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="text-center">
              <div className="text-lg font-bold font-display">2.4k</div>
              <p className="text-xs text-muted-foreground">Active Today</p>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full mt-auto group">
          <MessageCircle className="w-4 h-4 mr-2" />
          Join Server
          <ExternalLink className="w-3 h-3 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Button>
      </div>
    </motion.div>
  );
};
