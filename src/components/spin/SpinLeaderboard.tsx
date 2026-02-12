import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, Sparkles, Coins, Crown, Zap, Gift, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchJsonOrThrow, API_BASE } from '@/lib/apiFetch';
import { SpinHistoryList } from './SpinHistory';

interface SpinLeaderboardEntry {
  role_id: number;
  char_name: string;
  reward_type: string;
  reward_value: number;
  spun_at: string;
  label: string;
  color: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  coins: <Coins className="h-3.5 w-3.5" />,
  crown: <Crown className="h-3.5 w-3.5" />,
  zap: <Zap className="h-3.5 w-3.5" />,
  vip: <Crown className="h-3.5 w-3.5" />,
  zen: <Zap className="h-3.5 w-3.5" />,
};

const RANK_CONFIG = [
  { icon: <Trophy className="h-5 w-5" />, gradient: 'from-amber-500 to-yellow-400', glow: 'shadow-amber-500/30', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { icon: <Medal className="h-5 w-5" />, gradient: 'from-slate-300 to-slate-400', glow: 'shadow-slate-400/20', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
  { icon: <Award className="h-5 w-5" />, gradient: 'from-amber-700 to-amber-600', glow: 'shadow-amber-700/20', bg: 'bg-amber-700/10', border: 'border-amber-700/30' },
];

export function SpinLeaderboard() {
  const [entries, setEntries] = useState<SpinLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJsonOrThrow<{ success: boolean; leaderboard: SpinLeaderboardEntry[] }>(
          `${API_BASE}/spin_wheel.php?action=leaderboard&limit=10`
        );
        setEntries(data.leaderboard || []);
      } catch (err) {
        console.error('Failed to load spin leaderboard:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatReward = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  if (loading) {
    return (
      <Card className="bg-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" />
            Recent Winners
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
            <Trophy className="h-4 w-4 text-amber-500" />
            Recent Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No winners yet</p>
            <p className="text-xs mt-1">Be the first to spin!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="winners" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-3 bg-muted/50">
        <TabsTrigger value="winners" className="gap-1.5 text-xs font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-orange-500/20">
          <Trophy className="h-3.5 w-3.5" />
          Winners
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-1.5 text-xs font-medium data-[state=active]:bg-primary/20">
          <History className="h-3.5 w-3.5" />
          My History
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="winners" className="mt-0">
        <Card className="bg-card border-primary/20 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <Trophy className="h-4 w-4" />
              </div>
              Recent Winners
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[340px]">
              <div className="p-3 space-y-1.5">
                {entries.map((entry, index) => {
                  const isTop3 = index < 3;
                  const rankConfig = isTop3 ? RANK_CONFIG[index] : null;
                  
                  return (
                    <motion.div
                      key={`${entry.role_id}-${entry.spun_at}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 group ${
                        isTop3
                          ? `${rankConfig!.bg} ${rankConfig!.border} border shadow-sm ${rankConfig!.glow} hover:shadow-md`
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Rank indicator */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isTop3
                          ? `bg-gradient-to-br ${rankConfig!.gradient} text-white shadow-sm`
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isTop3 ? rankConfig!.icon : (
                          <span className="text-xs font-bold">#{index + 1}</span>
                        )}
                      </div>
                      
                      {/* Character info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isTop3 ? 'text-foreground' : 'text-foreground/90'}`}>
                          {entry.char_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{formatTime(entry.spun_at)}</p>
                      </div>
                      
                      {/* Reward badge */}
                      <Badge 
                        variant="outline" 
                        className="gap-1 text-xs shrink-0 font-semibold"
                        style={{ 
                          borderColor: entry.color, 
                          color: entry.color,
                          backgroundColor: (entry.color || '#3b82f6') + '15'
                        }}
                      >
                        {ICON_MAP[entry.reward_type] || <Gift className="h-3 w-3" />}
                        {formatReward(entry.reward_value)}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="history" className="mt-0">
        <SpinHistoryList />
      </TabsContent>
    </Tabs>
  );
}
