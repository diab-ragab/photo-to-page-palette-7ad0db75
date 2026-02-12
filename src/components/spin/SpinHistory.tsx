import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Coins, Crown, Zap, Gift, X, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchSpinHistory, type SpinHistory as SpinHistoryType } from '@/lib/spinWheelApi';

const ICON_MAP: Record<string, React.ReactNode> = {
  coins: <Coins className="h-3.5 w-3.5" />,
  crown: <Crown className="h-3.5 w-3.5" />,
  zap: <Zap className="h-3.5 w-3.5" />,
  vip: <Crown className="h-3.5 w-3.5" />,
  zen: <Zap className="h-3.5 w-3.5" />,
  nothing: <X className="h-3.5 w-3.5" />,
};

interface LifetimeRewards {
  coins: number;
  zen: number;
  vip: number;
  totalSpins: number;
  winRate: number;
}

export function SpinHistoryList() {
  const [history, setHistory] = useState<SpinHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSpinHistory(50);
        setHistory(data || []);
      } catch (err) {
        console.error('Failed to load spin history:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const lifetimeRewards = useMemo<LifetimeRewards>(() => {
    const totals = { coins: 0, zen: 0, vip: 0, totalSpins: history.length, winRate: 0 };
    let wins = 0;
    
    history.forEach((entry) => {
      const value = entry.reward_value || 0;
      if (entry.reward_type !== 'nothing') wins++;
      switch (entry.reward_type) {
        case 'coins': totals.coins += value; break;
        case 'zen': totals.zen += value; break;
        case 'vip': totals.vip += value; break;
      }
    });
    
    totals.winRate = history.length > 0 ? Math.round((wins / history.length) * 100) : 0;
    return totals;
  }, [history]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <History className="h-4 w-4 text-primary" />
            My Spin History
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

  if (error || history.length === 0) {
    return (
      <Card className="bg-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            My Spin History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{error ? 'Failed to load history' : 'No spins yet'}</p>
            <p className="text-xs mt-1">{error ? 'Please try again later' : 'Try your luck!'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasRewards = lifetimeRewards.coins > 0 || lifetimeRewards.zen > 0 || lifetimeRewards.vip > 0;

  return (
    <Card className="bg-card border-primary/20 overflow-hidden">
      <CardHeader className="pb-2 px-3 py-2.5 md:px-6 md:py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <div className="p-1 md:p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <History className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </div>
          My Spin History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Stats Summary */}
        {hasRewards && (
          <div className="p-3 border-b border-border">
            {/* Stats row */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stats</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-lg font-bold text-foreground">{lifetimeRewards.totalSpins}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Spins</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-lg font-bold text-primary">{lifetimeRewards.winRate}%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Win Rate</p>
              </div>
            </div>

            {/* Lifetime earnings */}
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground">Lifetime Earnings</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lifetimeRewards.coins > 0 && (
                <Badge variant="outline" className="gap-1 text-xs border-amber-500/40 text-amber-500 bg-amber-500/10 font-semibold">
                  <Coins className="h-3 w-3" />
                  {formatReward(lifetimeRewards.coins)} Coins
                </Badge>
              )}
              {lifetimeRewards.zen > 0 && (
                <Badge variant="outline" className="gap-1 text-xs border-cyan-500/40 text-cyan-500 bg-cyan-500/10 font-semibold">
                  <Zap className="h-3 w-3" />
                  {formatReward(lifetimeRewards.zen)} Zen
                </Badge>
              )}
              {lifetimeRewards.vip > 0 && (
                <Badge variant="outline" className="gap-1 text-xs border-purple-500/40 text-purple-500 bg-purple-500/10 font-semibold">
                  <Crown className="h-3 w-3" />
                  {formatReward(lifetimeRewards.vip)} VIP
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* History list */}
        <ScrollArea className="h-[220px]">
          <div className="p-3 space-y-1">
            {history.slice(0, 20).map((entry, index) => {
              const isNothing = entry.reward_type === 'nothing';
              
              return (
                <motion.div
                  key={entry.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                    isNothing ? 'opacity-50' : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Icon */}
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ 
                      backgroundColor: isNothing ? 'hsl(var(--muted))' : (entry.color || '#3b82f6') + '20',
                      color: isNothing ? 'hsl(var(--muted-foreground))' : entry.color || '#3b82f6'
                    }}
                  >
                    {ICON_MAP[entry.reward_type] || <Gift className="h-4 w-4" />}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.label || (isNothing ? 'No reward' : `${entry.reward_value} ${entry.reward_type}`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(entry.spun_at)}</p>
                  </div>
                  
                  {/* Reward badge */}
                  {!isNothing && (
                    <Badge 
                      variant="outline" 
                      className="gap-1 text-xs shrink-0 font-semibold"
                      style={{ 
                        borderColor: entry.color, 
                        color: entry.color,
                        backgroundColor: (entry.color || '#3b82f6') + '15'
                      }}
                    >
                      +{formatReward(entry.reward_value)}
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
