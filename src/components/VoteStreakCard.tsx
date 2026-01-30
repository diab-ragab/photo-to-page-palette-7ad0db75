import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Clock, TrendingUp } from "lucide-react";
import type { StreakData } from "@/hooks/useVoteSystem";

interface VoteStreakCardProps {
  streakData: StreakData;
}

export const VoteStreakCard = ({ streakData }: VoteStreakCardProps) => {
  const { current, longest, tier, nextTier, expiresAt } = streakData;

  // Calculate time remaining until streak expires
  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const now = Date.now();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Calculate progress to next tier
  const getProgress = () => {
    if (!nextTier) return 100;
    const tierThresholds: Record<string, number> = {
      rising: 3,
      warrior: 7,
      champion: 14,
      legend: 30
    };
    const currentThreshold = tierThresholds[tier.tier] || 0;
    const nextThreshold = tierThresholds[nextTier.tier] || currentThreshold + nextTier.days_needed;
    const progress = ((current - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      {/* Decorative gradient */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: tier.color }}
      />
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span>Vote Streak</span>
          </div>
          <div 
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ 
              backgroundColor: `${tier.color}20`,
              color: tier.color,
              border: `1px solid ${tier.color}40`
            }}
          >
            {tier.name}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ 
                backgroundColor: `${tier.color}20`,
                color: tier.color
              }}
            >
              {current}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-lg font-semibold">{tier.multiplier}x Bonus</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Best: {longest}</span>
            </div>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Next: {nextTier.tier.charAt(0).toUpperCase() + nextTier.tier.slice(1)} ({nextTier.multiplier}x)
              </span>
              <span className="font-medium" style={{ color: tier.color }}>
                {nextTier.days_needed} days left
              </span>
            </div>
            <Progress 
              value={getProgress()} 
              className="h-2"
              style={{ 
                // @ts-ignore - Custom CSS property for indicator color
                '--progress-color': tier.color 
              } as React.CSSProperties}
            />
          </div>
        )}

        {/* Streak expiration warning */}
        {timeRemaining && current > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Vote within <span className="font-semibold text-foreground">{timeRemaining}</span> to keep your streak
            </span>
          </div>
        )}

        {/* Tier info */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50">
          {[
            { name: 'Rising', days: 3, mult: '1.25x', color: '#10B981' },
            { name: 'Warrior', days: 7, mult: '1.5x', color: '#CD7F32' },
            { name: 'Champion', days: 14, mult: '1.75x', color: '#C0C0C0' },
            { name: 'Legend', days: 30, mult: '2x', color: '#FFD700' }
          ].map((t) => {
            const isActive = tier.tier === t.name.toLowerCase();
            return (
              <div 
                key={t.name}
                className={`text-center p-2 rounded-lg transition-all ${
                  isActive ? 'ring-1 ring-offset-1 ring-offset-background' : 'opacity-50'
                }`}
                style={{ 
                  backgroundColor: isActive ? `${t.color}15` : 'transparent',
                  boxShadow: isActive ? `0 0 0 1px ${t.color}` : 'none'
                }}
              >
                <p className="text-[10px] font-medium" style={{ color: t.color }}>{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.days}d</p>
                <p className="text-xs font-bold">{t.mult}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
