import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { VoteStreakData } from "@/lib/voteStreakApi";
import { Flame, Trophy, Timer, TrendingUp, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoteStreakCardProps {
  streakData: VoteStreakData | null;
  loading?: boolean;
}

export const VoteStreakCard = ({ streakData, loading }: VoteStreakCardProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  // Calculate time remaining until streak expires
  useEffect(() => {
    if (!streakData?.streakExpiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(streakData.streakExpiresAt!).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        setIsExpiringSoon(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      setIsExpiringSoon(hours < 6); // Less than 6 hours
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [streakData?.streakExpiresAt]);

  if (loading) {
    return (
      <Card className="bg-card border-primary/20 animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!streakData) return null;

  const { currentStreak, longestStreak, currentMultiplier, streakBadge, nextTier } = streakData;

  // Calculate progress to next tier
  const progressToNext = nextTier
    ? ((currentStreak - (nextTier.days > currentStreak ? 0 : streakData.currentTier?.min_streak || 0)) /
        (nextTier.days - (streakData.currentTier?.min_streak || 0))) *
      100
    : 100;

  return (
    <Card className="relative bg-card border-primary/20 overflow-hidden">
      {/* Animated glow background for active streaks */}
      {currentStreak >= 3 && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-yellow-500/10"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <motion.div
              animate={currentStreak >= 3 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Flame className={`h-5 w-5 ${currentStreak >= 7 ? "text-orange-500" : currentStreak >= 3 ? "text-yellow-500" : "text-muted-foreground"}`} />
            </motion.div>
            Vote Streak
          </div>
          {streakBadge && (
            <Badge variant="secondary" className="gap-1 bg-primary/20 text-primary">
              <span>{streakBadge.icon}</span>
              {streakBadge.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Main Streak Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStreak}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-4xl font-bold text-primary"
              >
                {currentStreak}
              </motion.div>
            </AnimatePresence>
            <div className="text-sm text-muted-foreground">
              <div>day{currentStreak !== 1 ? "s" : ""}</div>
              <div className="flex items-center gap-1 text-xs">
                <Trophy className="h-3 w-3 text-yellow-500" />
                Best: {longestStreak}
              </div>
            </div>
          </div>

          {/* Multiplier Badge */}
          {currentMultiplier > 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full"
            >
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-green-500 font-bold">{currentMultiplier}x</span>
            </motion.div>
          )}
        </div>

        {/* Progress to Next Tier */}
        {nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {currentStreak}/{nextTier.days} days to {nextTier.badge_name || `${nextTier.multiplier}x`}
              </span>
              <span>{Math.round(progressToNext)}%</span>
            </div>
            <Progress value={Math.min(progressToNext, 100)} className="h-2" />
          </div>
        )}

        {/* Streak Expiration Warning */}
        {timeRemaining && currentStreak > 0 && (
          <div
            className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
              isExpiringSoon
                ? "bg-destructive/10 border border-destructive/30 text-destructive"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {isExpiringSoon ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <Timer className="h-4 w-4 shrink-0" />
            )}
            <span>
              {isExpiringSoon ? "⚠️ Vote soon! " : ""}
              Streak expires in: <span className="font-mono font-medium">{timeRemaining}</span>
            </span>
          </div>
        )}

        {/* Streak Benefits Summary */}
        {currentStreak >= 3 && streakData.currentTier && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Current bonuses:</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded">
                +{streakData.currentTier.bonus_coins} coins
              </span>
              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                +{streakData.currentTier.bonus_vip} VIP
              </span>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded">
                {currentMultiplier}x rewards
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
