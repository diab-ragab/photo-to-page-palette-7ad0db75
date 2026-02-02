import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/siteSettingsApi";

export const DiscordCard = () => {
  const [discordLink, setDiscordLink] = useState('https://discord.gg/vubqbv3U3y');
  const [memberCount, setMemberCount] = useState('15,403');

  useEffect(() => {
    getSiteSettings().then(settings => {
      setDiscordLink(settings.discord_link);
      setMemberCount(settings.discord_members);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card p-3 md:p-4"
    >
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-[#5865F2] flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-xs md:text-sm">Discord</h3>
          <p className="text-[10px] md:text-xs text-muted-foreground">{memberCount} Members</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[10px] md:text-xs px-2 md:px-3"
          onClick={() => window.open(discordLink, '_blank')}
        >
          <span className="hidden sm:inline">Join Server</span>
          <span className="sm:hidden">Join</span>
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
};
