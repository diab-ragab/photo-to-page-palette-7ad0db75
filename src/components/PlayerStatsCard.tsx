import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  Share2, 
  Vote, 
  Flame, 
  Crown, 
  ShoppingCart, 
  Coins, 
  Users, 
  Sword, 
  Trophy, 
  Calendar, 
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchPlayerStats, type PlayerStats } from '@/lib/playerStatsApi';
import { toast } from 'sonner';

const VIP_NAMES = ['Standard', 'VIP I', 'VIP II', 'VIP III'];
const VIP_COLORS = ['text-muted-foreground', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}

function StatItem({ icon, label, value, subValue, color = 'text-primary' }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`p-2 rounded-lg bg-background ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="font-semibold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
    </div>
  );
}

export function PlayerStatsCard() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchPlayerStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load player stats:', err);
      toast.error('Failed to load player stats');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getAccountAge = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const created = new Date(dateStr);
      const now = new Date();
      const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 30) return `${days} days`;
      if (days < 365) return `${Math.floor(days / 30)} months`;
      return `${Math.floor(days / 365)} years`;
    } catch {
      return '';
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current || !stats) return;
    
    setDownloading(true);
    try {
      // Dynamic import for html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `${stats.username}-stats.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Stats card downloaded!');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download stats card');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!stats) return;
    
    const shareText = `🎮 ${stats.username}'s WOI Stats\n` +
      `🗳️ Votes: ${stats.total_votes} | 🔥 Streak: ${stats.vote_streak}\n` +
      `👑 ${VIP_NAMES[stats.vip_level]} | 🏆 ${stats.achievements_unlocked}/${stats.achievements_total} Achievements\n` +
      `⚔️ Characters: ${stats.character_count} | Max Level: ${stats.highest_level}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Stats copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-card border-primary/20">
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load stats. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-card border-primary/20 overflow-hidden" ref={cardRef}>
        <CardHeader className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
              Player Stats
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download className={`h-4 w-4 ${downloading ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-purple-500/5 to-transparent border border-primary/10">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary-foreground">
                {(stats.username || '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-lg truncate">{stats.username}</h3>
              <Badge className={`${VIP_COLORS[stats.vip_level]} bg-transparent border-current`}>
                <Crown className="h-3 w-3 mr-1" />
                {VIP_NAMES[stats.vip_level]}
              </Badge>
              {stats.account_created && (
                <p className="text-xs text-muted-foreground mt-1">
                  Playing for {getAccountAge(stats.account_created)}
                </p>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              icon={<Vote className="h-4 w-4" />}
              label="Total Votes"
              value={stats.total_votes}
              color="text-green-500"
            />
            <StatItem
              icon={<Flame className="h-4 w-4" />}
              label="Vote Streak"
              value={stats.vote_streak}
              subValue={`Best: ${stats.best_streak}`}
              color="text-orange-500"
            />
            <StatItem
              icon={<Coins className="h-4 w-4" />}
              label="Vote Coins"
              value={stats.coins}
              color="text-yellow-500"
            />
            <StatItem
              icon={<Crown className="h-4 w-4" />}
              label="VIP Points"
              value={stats.vip_points}
              color="text-purple-500"
            />
            <StatItem
              icon={<Users className="h-4 w-4" />}
              label="Characters"
              value={stats.character_count}
              color="text-blue-500"
            />
            <StatItem
              icon={<Sword className="h-4 w-4" />}
              label="Highest Level"
              value={stats.highest_level}
              color="text-red-500"
            />
            <StatItem
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Purchases"
              value={stats.total_purchases}
              subValue={stats.total_spent > 0 ? `$${stats.total_spent.toFixed(2)} spent` : undefined}
              color="text-emerald-500"
            />
            <StatItem
              icon={<Trophy className="h-4 w-4" />}
              label="Achievements"
              value={`${stats.achievements_unlocked}/${stats.achievements_total}`}
              color="text-amber-500"
            />
          </div>

          {/* Zen Balance */}
          {stats.total_zen > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-cyan-400" />
                  <span className="text-sm text-muted-foreground">Total Zen</span>
                </div>
                <span className="text-xl font-bold text-cyan-400">
                  {stats.total_zen.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Joined {formatDate(stats.account_created)}</span>
            </div>
            {stats.last_login && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Last login {formatDate(stats.last_login)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
