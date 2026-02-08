import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Coins, Crown, Zap, Gift, X, Calendar } from 'lucide-react';
import { fetchSpinHistory, type SpinHistory as SpinHistoryType } from '@/lib/spinWheelApi';

const ICON_MAP: Record<string, React.ReactNode> = {
  coins: <Coins className="h-3 w-3" />,
  crown: <Crown className="h-3 w-3" />,
  zap: <Zap className="h-3 w-3" />,
  vip: <Crown className="h-3 w-3" />,
  zen: <Zap className="h-3 w-3" />,
  nothing: <X className="h-3 w-3" />,
};

export function SpinHistoryList() {
  const [history, setHistory] = useState<SpinHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSpinHistory(20);
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
            <Skeleton key={i} className="h-12 w-full" />
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
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {error ? 'Failed to load history' : 'No spins yet. Try your luck!'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-primary" />
          My Spin History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="p-3 space-y-1">
            {history.map((entry, index) => {
              const isNothing = entry.reward_type === 'nothing';
              
              return (
                <div 
                  key={entry.id || index}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isNothing ? 'opacity-60' : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Icon */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
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
                    <p className="text-xs text-muted-foreground">{formatDate(entry.spun_at)}</p>
                  </div>
                  
                  {/* Reward badge */}
                  {!isNothing && (
                    <Badge 
                      variant="outline" 
                      className="gap-1 text-xs shrink-0"
                      style={{ borderColor: entry.color, color: entry.color }}
                    >
                      +{formatReward(entry.reward_value)}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
