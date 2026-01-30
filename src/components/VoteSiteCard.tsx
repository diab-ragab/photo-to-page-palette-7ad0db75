import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Coins, Crown, CheckCircle2 } from "lucide-react";
import type { VoteSiteStatus } from "@/lib/voteSitesApi";

interface VoteSiteCardProps {
  site: VoteSiteStatus;
  onVote: (siteId: number) => Promise<void>;
  loading: boolean;
}

export const VoteSiteCard = ({ site, onVote, loading }: VoteSiteCardProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (site.canVote || !site.lastVoteTime) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const lastVote = new Date(site.lastVoteTime!).getTime();
      const nextVote = lastVote + site.cooldown_hours * 60 * 60 * 1000;
      const now = Date.now();
      const diff = nextVote - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [site.lastVoteTime, site.cooldown_hours, site.canVote]);

  const handleVote = async () => {
    setIsVoting(true);
    // Open vote site in new tab
    window.open(site.url, "_blank", "noopener,noreferrer");
    // Submit vote after short delay (user has time to vote on external site)
    await onVote(site.id);
    setIsVoting(false);
  };

  const canVoteNow = site.canVote && !timeRemaining;
  const hasVotedRecently = !site.canVote && site.lastVoteTime !== null;

  return (
    <div
      className={`group relative p-[1px] rounded-xl transition-all duration-500 ${
        canVoteNow
          ? "bg-gradient-to-br from-primary/70 via-purple-500/50 to-primary/70 hover:from-primary hover:via-purple-500 hover:to-primary shadow-lg shadow-primary/20"
          : "bg-gradient-to-br from-muted/50 via-transparent to-muted/50"
      }`}
    >
      <Card
        className={`relative bg-card rounded-xl overflow-hidden transition-all duration-300 ${
          canVoteNow ? "group-hover:translate-y-[-2px]" : "opacity-75"
        }`}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {site.image_url ? (
                <img
                  src={site.image_url}
                  alt={site.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              )}
              <span className="font-semibold text-sm">{site.name}</span>
            </div>
            {hasVotedRecently && (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
          </div>

          {/* Rewards */}
          <div className="flex items-center gap-3 mb-4 text-xs">
            <div className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-yellow-500 font-medium">{site.coins_reward}</span>
            </div>
            <div className="flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-purple-400 font-medium">{site.vip_reward}</span>
            </div>
          </div>

          {/* Action */}
          {canVoteNow ? (
            <Button
              onClick={handleVote}
              disabled={loading || isVoting}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              size="sm"
            >
              {isVoting ? "Opening..." : "Vote Now"}
              <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted/50 rounded-lg">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono font-medium text-muted-foreground">
                {timeRemaining || "Ready soon..."}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
