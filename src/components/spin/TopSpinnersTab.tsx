import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Medal, Award, Sparkles, Gift, RefreshCw, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchTopSpinners, type TopSpinnerEntry, type TopSpinnerRewardSettings } from '@/lib/spinWheelApi';

const RANK_CONFIG = [
  { icon: <Trophy className="h-4 w-4" />, gradient: 'from-amber-500 to-yellow-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { icon: <Medal className="h-4 w-4" />, gradient: 'from-slate-300 to-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
  { icon: <Award className="h-4 w-4" />, gradient: 'from-amber-700 to-amber-600', bg: 'bg-amber-700/10', border: 'border-amber-700/30' },
];

export function TopSpinnersTab() {
  const [entries, setEntries] = useState<TopSpinnerEntry[]>([]);
  const [reward, setReward] = useState<TopSpinnerRewardSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchTopSpinners(10);
      setEntries(data.top_spinners || []);
      setReward(data.reward || null);
    } catch {
      if (!entries.length) setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 30000);
    const handleVis = () => {
      if (!document.hidden) loadData();
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [loadData]);

  if (loading) {
    return (
      <Card className="bg-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCw className="h-4 w-4 text-amber-500" />
            Today's Top Spinners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || entries.length === 0) {
    return (
      <Card className="bg-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCw className="h-4 w-4 text-amber-500" />
            Today's Top Spinners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No spins today yet</p>
            <p className="text-xs mt-1">Be the first to spin!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/20 overflow-hidden">
      <CardHeader className="pb-2 px-3 py-2.5 md:px-6 md:py-4 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <div className="p-1 md:p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
              <RotateCw className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
            Today's Top Spinners
          </CardTitle>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
            Live
          </div>
        </div>
        {reward && reward.enabled === '1' && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Gift className="h-3 w-3 text-amber-500" />
            <span>
              Daily reward for #1: <span className="font-semibold text-foreground">
                {Number(reward.reward_value).toLocaleString()} {reward.reward_type}
              </span>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] md:h-[400px]">
          <div className="p-3 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {entries.map((entry, index) => {
                const isTop3 = index < 3;
                const rankConfig = isTop3 ? RANK_CONFIG[index] : null;

                return (
                  <motion.div
                    key={`${entry.user_id}-${entry.role_id}`}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                    className={`relative flex items-center gap-2 p-2 md:p-2.5 rounded-xl transition-all duration-200 group ${
                      isTop3
                        ? `${rankConfig!.bg} ${rankConfig!.border} border`
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {/* Rank indicator */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isTop3
                        ? `bg-gradient-to-br ${rankConfig!.gradient} text-white shadow-sm`
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isTop3 ? rankConfig!.icon : (
                        <span className="text-[10px] font-bold">#{index + 1}</span>
                      )}
                    </div>

                    {/* Character info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{entry.char_name}</p>
                    </div>

                    {/* Spin count */}
                    <Badge
                      variant="outline"
                      className="gap-1 text-xs shrink-0 font-semibold border-cyan-500/50 text-cyan-500 bg-cyan-500/10"
                    >
                      <RotateCw className="h-3 w-3" />
                      {entry.spin_count} spins
                    </Badge>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
