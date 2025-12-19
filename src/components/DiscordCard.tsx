import { motion } from "framer-motion";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DiscordCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#5865F2] flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-sm">Discord</h3>
          <p className="text-xs text-muted-foreground">15,403 Members</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          Join Server
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
};
