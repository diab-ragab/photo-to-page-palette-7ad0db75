import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award, Sparkles, Coins, Crown, Zap, Gift } from 'lucide-react';
import { fetchJsonOrThrow, API_BASE } from '@/lib/apiFetch';

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
  coins: <Coins className="h-3 w-3" />,
  crown: <Crown className="h-3 w-3" />,
  zap: <Zap className="h-3 w-3" />,
  vip: <Crown className="h-3 w-3" />,
  zen: <Zap className="h-3 w-3" />,
};

const RANK_ICONS = [
  <Trophy className="h-4 w-4 text-amber-500" />,
  <Medal className="h-4 w-4 text-gray-400" />,
  <Award className="h-4 w-4 text-amber-700" />,
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
            <Skeleton key={i} className="h-10 w-full" />
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
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No winners yet. Be the first!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" />
          Recent Winners
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-1">
        {entries.map((entry, index) => (
          <div 
            key={`${entry.role_id}-${entry.spun_at}`}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {/* Rank */}
            <div className="w-6 flex justify-center">
              {index < 3 ? RANK_ICONS[index] : (
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
              )}
            </div>
            
            {/* Character name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.char_name}</p>
              <p className="text-xs text-muted-foreground">{formatTime(entry.spun_at)}</p>
            </div>
            
            {/* Reward */}
            <Badge 
              variant="outline" 
              className="gap-1 text-xs shrink-0"
              style={{ borderColor: entry.color, color: entry.color }}
            >
              {ICON_MAP[entry.reward_type] || <Gift className="h-3 w-3" />}
              {formatReward(entry.reward_value)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
