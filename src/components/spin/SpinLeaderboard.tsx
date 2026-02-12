import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, Sparkles, Coins, Crown, Zap, Gift, History, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  { icon: <Trophy className="h-4 w-4" />, gradient: 'from-amber-500 to-yellow-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { icon: <Medal className="h-4 w-4" />, gradient: 'from-slate-300 to-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
  { icon: <Award className="h-4 w-4" />, gradient: 'from-amber-700 to-amber-600', bg: 'bg-amber-700/10', border: 'border-amber-700/30' },
];

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

export function SpinLeaderboard() {
  const [entries, setEntries] = useState<SpinLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newEntryKeys, setNewEntryKeys] = useState<Set<string>>(new Set());
  const prevEntriesRef = useRef<string[]>([]);

  const loadEntries = useCallback(async (isRefresh = false) => {
    try {
      const data = await fetchJsonOrThrow<{ success: boolean; leaderboard: SpinLeaderboardEntry[] }>(
        `${API_BASE}/spin_wheel.php?action=leaderboard&limit=10`
      );
      const newList = data.leaderboard || [];

      // Detect new entries on refresh
      if (isRefresh && prevEntriesRef.current.length > 0) {
        const newKeys = new Set<string>();
        newList.forEach(e => {
          const key = `${e.role_id}-${e.spun_at}`;
          if (!prevEntriesRef.current.includes(key)) {
            newKeys.add(key);
          }
        });
        if (newKeys.size > 0) {
          setNewEntryKeys(newKeys);
          setTimeout(() => setNewEntryKeys(new Set()), 3000);
        }
      }

      prevEntriesRef.current = newList.map(e => `${e.role_id}-${e.spun_at}`);
      setEntries(newList);
    } catch (err) {
      console.error('Failed to load spin leaderboard:', err);
      if (!entries.length) setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadEntries(false);
  }, [loadEntries]);

  // Auto-refresh with visibility API
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const startInterval = () => {
      interval = setInterval(() => loadEntries(true), AUTO_REFRESH_INTERVAL);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        loadEntries(true);
        startInterval();
      }
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadEntries]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <Trophy className="h-4 w-4" />
                </div>
                Recent Winners
              </CardTitle>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
                Live
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3 space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {entries.map((entry, index) => {
                    const isTop3 = index < 3;
                    const rankConfig = isTop3 ? RANK_CONFIG[index] : null;
                    const entryKey = `${entry.role_id}-${entry.spun_at}`;
                    const isNew = newEntryKeys.has(entryKey);
                    
                    return (
                      <motion.div
                        key={entryKey}
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                        className={`relative flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 group ${
                          isTop3
                            ? `${rankConfig!.bg} ${rankConfig!.border} border`
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        {/* Sparkle overlay for new top-3 entries */}
                        {isNew && isTop3 && (
                          <motion.div
                            className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            {[...Array(8)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1 h-1 rounded-full bg-amber-400"
                                style={{
                                  left: `${10 + Math.random() * 80}%`,
                                  top: `${10 + Math.random() * 80}%`,
                                }}
                                animate={{
                                  scale: [0, 1.5, 0],
                                  opacity: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 1.2,
                                  delay: i * 0.15,
                                  repeat: 2,
                                }}
                              />
                            ))}
                            <motion.div
                              className="absolute inset-0 rounded-xl"
                              style={{
                                background: 'linear-gradient(90deg, transparent, hsla(45, 100%, 70%, 0.15), transparent)',
                              }}
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 1.5, repeat: 2 }}
                            />
                          </motion.div>
                        )}

                        {/* New badge for fresh entries */}
                        {isNew && (
                          <motion.div
                            className="absolute -top-1 -right-1 z-10"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            <Badge className="text-[9px] px-1.5 py-0 bg-green-500 text-white border-0">
                              NEW
                            </Badge>
                          </motion.div>
                        )}

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
                          <p className="text-[10px] text-muted-foreground">{formatTime(entry.spun_at)}</p>
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
                </AnimatePresence>
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
