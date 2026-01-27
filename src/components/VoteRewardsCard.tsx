import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Coins, Crown, TrendingUp, Zap } from "lucide-react";
import type { VoteSiteStatus } from "@/lib/voteSitesApi";

interface VoteRewardsCardProps {
  sites: VoteSiteStatus[];
  loading?: boolean;
}

export const VoteRewardsCard = ({ sites, loading }: VoteRewardsCardProps) => {
  // Calculate totals
  const availableSites = sites.filter(s => s.canVote);
  const totalCoinsAvailable = availableSites.reduce((sum, s) => sum + s.coins_reward, 0);
  const totalVipAvailable = availableSites.reduce((sum, s) => sum + s.vip_reward, 0);
  const maxCoinsPerCycle = sites.reduce((sum, s) => sum + s.coins_reward, 0);
  const maxVipPerCycle = sites.reduce((sum, s) => sum + s.vip_reward, 0);

  if (loading) {
    return (
      <Card className="bg-card border-primary/20 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/20 overflow-hidden relative">
      {/* Glow effect */}
      {availableSites.length > 0 && (
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      )}
      
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Gift className="h-5 w-5 text-green-500" />
          </div>
          Vote Rewards
          {availableSites.length > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs font-normal px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
              <Zap className="h-3 w-3" />
              {availableSites.length} available
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Available Rewards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-xl transition-all duration-300 ${
            totalCoinsAvailable > 0 
              ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30" 
              : "bg-muted/30"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Coins className={`h-4 w-4 ${totalCoinsAvailable > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">Available</span>
            </div>
            <div className={`text-2xl font-bold ${totalCoinsAvailable > 0 ? "text-yellow-500" : "text-muted-foreground"}`}>
              +{totalCoinsAvailable}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Coins</div>
          </div>

          <div className={`p-4 rounded-xl transition-all duration-300 ${
            totalVipAvailable > 0 
              ? "bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30" 
              : "bg-muted/30"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Crown className={`h-4 w-4 ${totalVipAvailable > 0 ? "text-purple-400" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">Available</span>
            </div>
            <div className={`text-2xl font-bold ${totalVipAvailable > 0 ? "text-purple-400" : "text-muted-foreground"}`}>
              +{totalVipAvailable}
            </div>
            <div className="text-xs text-muted-foreground mt-1">VIP Points</div>
          </div>
        </div>

        {/* Max Per Cycle */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Max rewards per cycle (12h)</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-500 font-medium">{maxCoinsPerCycle}</span>
              <span className="text-muted-foreground">coins</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-400" />
              <span className="text-purple-400 font-medium">{maxVipPerCycle}</span>
              <span className="text-muted-foreground">VIP</span>
            </div>
          </div>
        </div>

        {/* Motivation message */}
        {availableSites.length === 0 && sites.length > 0 && (
          <div className="text-center py-2 text-xs text-muted-foreground">
            🎉 All votes claimed! Check back in 12 hours.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
