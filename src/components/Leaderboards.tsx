import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Vote, Crown, Medal, Flame } from "lucide-react";
import { voteStreakApi } from "@/lib/voteStreakApi";

interface LeaderboardPlayer {
  rank: number;
  username: string;
  value: number;
  vipLevel?: number;
}

interface StreakLeaderboardPlayer {
  rank: number;
  username: string;
  current_streak: number;
  longest_streak: number;
}

const mockTopVoters: LeaderboardPlayer[] = [
  { rank: 1, username: "DragonSlayer", value: 847, vipLevel: 3 },
  { rank: 2, username: "ShadowMage", value: 723, vipLevel: 3 },
  { rank: 3, username: "NightBlade", value: 698, vipLevel: 2 },
  { rank: 4, username: "StormKnight", value: 612, vipLevel: 2 },
  { rank: 5, username: "PhoenixRider", value: 589, vipLevel: 2 },
  { rank: 6, username: "IceWarlock", value: 534, vipLevel: 1 },
  { rank: 7, username: "BlazeFury", value: 498, vipLevel: 1 },
  { rank: 8, username: "DarkPaladin", value: 467, vipLevel: 1 },
  { rank: 9, username: "ThunderBolt", value: 445, vipLevel: 1 },
  { rank: 10, username: "MysticArcher", value: 423, vipLevel: 1 },
];

const mockVipRankings: LeaderboardPlayer[] = [
  { rank: 1, username: "DragonSlayer", value: 21175, vipLevel: 3 },
  { rank: 2, username: "ShadowMage", value: 18075, vipLevel: 3 },
  { rank: 3, username: "NightBlade", value: 17450, vipLevel: 3 },
  { rank: 4, username: "StormKnight", value: 15300, vipLevel: 3 },
  { rank: 5, username: "PhoenixRider", value: 14725, vipLevel: 3 },
  { rank: 6, username: "IceWarlock", value: 13350, vipLevel: 3 },
  { rank: 7, username: "BlazeFury", value: 12450, vipLevel: 3 },
  { rank: 8, username: "DarkPaladin", value: 11675, vipLevel: 3 },
  { rank: 9, username: "ThunderBolt", value: 11125, vipLevel: 3 },
  { rank: 10, username: "MysticArcher", value: 10575, vipLevel: 3 },
];

const mockStreakLeaderboard: StreakLeaderboardPlayer[] = [
  { rank: 1, username: "DragonSlayer", current_streak: 45, longest_streak: 67 },
  { rank: 2, username: "ShadowMage", current_streak: 38, longest_streak: 52 },
  { rank: 3, username: "NightBlade", current_streak: 31, longest_streak: 44 },
  { rank: 4, username: "StormKnight", current_streak: 28, longest_streak: 35 },
  { rank: 5, username: "PhoenixRider", current_streak: 24, longest_streak: 30 },
  { rank: 6, username: "IceWarlock", current_streak: 19, longest_streak: 28 },
  { rank: 7, username: "BlazeFury", current_streak: 15, longest_streak: 22 },
  { rank: 8, username: "DarkPaladin", current_streak: 12, longest_streak: 19 },
  { rank: 9, username: "ThunderBolt", current_streak: 9, longest_streak: 15 },
  { rank: 10, username: "MysticArcher", current_streak: 7, longest_streak: 12 },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-400" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-300" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="w-5 text-center font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getVipBadge = (level?: number) => {
  if (!level) return null;
  const colors = {
    1: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    2: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    3: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${colors[level as keyof typeof colors]}`}>
      VIP {level}
    </span>
  );
};

const getStreakBadge = (streak: number) => {
  if (streak >= 30) return { text: "🔥 Legend", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  if (streak >= 14) return { text: "💎 Champion", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
  if (streak >= 7) return { text: "⭐ Warrior", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
  return null;
};

const getRankRowStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-500/10 to-transparent border-l-2 border-l-yellow-500";
    case 2:
      return "bg-gradient-to-r from-gray-400/10 to-transparent border-l-2 border-l-gray-400";
    case 3:
      return "bg-gradient-to-r from-amber-600/10 to-transparent border-l-2 border-l-amber-600";
    default:
      return "hover:bg-muted/50";
  }
};

export const Leaderboards = () => {
  const [topVoters, setTopVoters] = useState<LeaderboardPlayer[]>(mockTopVoters);
  const [vipRankings, setVipRankings] = useState<LeaderboardPlayer[]>(mockVipRankings);
  const [streakLeaderboard, setStreakLeaderboard] = useState<StreakLeaderboardPlayer[]>(mockStreakLeaderboard);
  const [loading, setLoading] = useState(false);
  const [streakLoading, setStreakLoading] = useState(false);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://woiendgame.online/api/leaderboards.php", { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.topVoters) setTopVoters(data.topVoters);
          if (data.vipRankings) setVipRankings(data.vipRankings);
        }
      } catch {
        // Silent fail - use mock leaderboard data
      } finally {
        setLoading(false);
      }
    };

    const fetchStreakLeaderboard = async () => {
      setStreakLoading(true);
      try {
        const data = await voteStreakApi.getLeaderboard();
        if (data.length > 0) {
          setStreakLeaderboard(data.map((player, index) => ({
            rank: index + 1,
            username: player.username,
            current_streak: player.current_streak,
            longest_streak: player.longest_streak,
          })));
        }
      } catch {
        // Silent fail - use mock data
      } finally {
        setStreakLoading(false);
      }
    };

    fetchLeaderboards();
    fetchStreakLeaderboard();
  }, []);

  const LeaderboardTable = ({ data, valueLabel }: { data: LeaderboardPlayer[]; valueLabel: string }) => (
    <div className="space-y-1">
      {data.map((player) => (
        <div
          key={player.rank}
          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${getRankRowStyle(player.rank)}`}
        >
          <div className="flex items-center gap-3">
            {getRankIcon(player.rank)}
            <div className="flex items-center gap-2">
              <span className={`font-medium ${player.rank <= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                {player.username}
              </span>
              {getVipBadge(player.vipLevel)}
            </div>
          </div>
          <div className="text-right">
            <span className={`font-bold ${player.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
              {player.value.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{valueLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const StreakLeaderboardTable = ({ data }: { data: StreakLeaderboardPlayer[] }) => (
    <div className="space-y-1">
      {data.map((player) => {
        const badge = getStreakBadge(player.current_streak);
        return (
          <div
            key={player.rank}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${getRankRowStyle(player.rank)}`}
          >
            <div className="flex items-center gap-3">
              {getRankIcon(player.rank)}
              <div className="flex items-center gap-2">
                <span className={`font-medium ${player.rank <= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                  {player.username}
                </span>
                {badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${badge.className}`}>
                    {badge.text}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <span className={`font-bold ${player.rank <= 3 ? "text-orange-500" : "text-muted-foreground"}`}>
                  {player.current_streak}
                </span>
                <span className="text-xs text-muted-foreground ml-1">days</span>
              </div>
              <div className="text-xs text-muted-foreground border-l border-border pl-3">
                Best: {player.longest_streak}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leaderboards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="voters" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="voters" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              <span className="hidden sm:inline">Top Voters</span>
              <span className="sm:hidden">Voters</span>
            </TabsTrigger>
            <TabsTrigger value="streaks" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Streaks</span>
              <span className="sm:hidden">Streaks</span>
            </TabsTrigger>
            <TabsTrigger value="vip" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">VIP Rankings</span>
              <span className="sm:hidden">VIP</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="voters" className="mt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <LeaderboardTable data={topVoters} valueLabel="votes" />
            )}
          </TabsContent>

          <TabsContent value="streaks" className="mt-0">
            {streakLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <StreakLeaderboardTable data={streakLeaderboard} />
            )}
          </TabsContent>
          
          <TabsContent value="vip" className="mt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <LeaderboardTable data={vipRankings} valueLabel="pts" />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
