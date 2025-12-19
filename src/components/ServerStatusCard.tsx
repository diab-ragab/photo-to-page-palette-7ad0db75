import { motion } from "framer-motion";
import { RefreshCw, Circle, Clock, Users, Server, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ServerStatusCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-display font-semibold">Server Status</span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
            <Circle className="w-2 h-2 fill-primary" />
            Online
          </span>
        </div>
        <button className="p-1.5 rounded-md hover:bg-secondary/50 transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Players</p>
          <p className="text-2xl font-bold font-display">854</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Uptime</p>
          <p className="text-2xl font-bold font-display">4d 12h</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Accounts</p>
          <p className="text-lg font-bold font-display">2,845</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Peak Today</p>
          <p className="text-lg font-bold font-display">120</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="default" size="sm" className="flex-1 text-[10px] md:text-xs px-2">
          Refresh
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-[10px] md:text-xs px-2">
          View Details
        </Button>
      </div>
    </motion.div>
  );
};
