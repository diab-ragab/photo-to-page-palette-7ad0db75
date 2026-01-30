import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Vote, Crown, Medal, Swords } from "lucide-react";

interface LeaderboardPlayer {
  rank: number;
  username: string;
  value: number;
  vipLevel?: number;
  class?: number;
}

const CLASS_NAMES: Record<number, string> = {
  0: "Warrior",
  1: "Mage",
  2: "Archer",
  3: "Assassin",
  4: "Summoner",
  5: "Paladin",
  6: "Necromancer",
  7: "Berserker",
  8: "Monk",
};

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
  const [topVoters, setTopVoters] = useState<LeaderboardPlayer[]>([]);
  const [vipRankings, setVipRankings] = useState<LeaderboardPlayer[]>([]);
  const [topCharacters, setTopCharacters] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://woiendgame.online/api/leaderboards.php");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTopVoters(data.topVoters || []);
            setVipRankings(data.vipRankings || []);
            setTopCharacters(data.topCharacters || []);
          }
        }
      } catch {
        // Silent fail - show empty leaderboards
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, []);

  const LeaderboardTable = ({ data, valueLabel, showClass }: { data: LeaderboardPlayer[]; valueLabel: string; showClass?: boolean }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No data available yet. Be the first!
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        {data.map((player) => (
          <div
            key={player.rank}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${getRankRowStyle(player.rank)}`}
          >
            <div className="flex items-center gap-3">
              {getRankIcon(player.rank)}
              <div className="flex flex-col">
                <span className={`font-medium ${player.rank <= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                  {player.username}
                </span>
                {showClass && player.class !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {CLASS_NAMES[player.class] || `Class ${player.class}`}
                  </span>
                )}
                {!showClass && getVipBadge(player.vipLevel)}
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
  };

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leaderboards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="characters" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="characters" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Top Levels
            </TabsTrigger>
            <TabsTrigger value="voters" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Top Voters
            </TabsTrigger>
            <TabsTrigger value="vip" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              VIP
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="characters" className="mt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <LeaderboardTable data={topCharacters} valueLabel="Lv" showClass />
            )}
          </TabsContent>
          
          <TabsContent value="voters" className="mt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <LeaderboardTable data={topVoters} valueLabel="votes" />
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
