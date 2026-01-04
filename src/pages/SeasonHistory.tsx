import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Crown,
  Gift,
  Calendar,
  Trophy,
  Star,
  Sparkles,
  ChevronRight,
  Lock,
  ArrowLeft,
} from "lucide-react";

interface SeasonReward {
  name: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  type: "free" | "elite";
}

interface PastSeason {
  id: number;
  name: string;
  month: string;
  year: number;
  theme: string;
  themeColor: string;
  totalParticipants: number;
  elitePassHolders: number;
  exclusiveRewards: SeasonReward[];
}

const pastSeasons: PastSeason[] = [
  {
    id: 12,
    name: "Winter's End",
    month: "December",
    year: 2025,
    theme: "Frost and Ice",
    themeColor: "from-cyan-500 to-blue-600",
    totalParticipants: 2847,
    elitePassHolders: 523,
    exclusiveRewards: [
      { name: "Frost Dragon Mount", icon: "🐉", rarity: "legendary", type: "elite" },
      { name: "Ice Crown", icon: "👑", rarity: "legendary", type: "elite" },
      { name: "Snowflake Pet", icon: "❄️", rarity: "epic", type: "free" },
      { name: "Winter Cloak", icon: "🧥", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 11,
    name: "Dark Harvest",
    month: "November",
    year: 2025,
    theme: "Shadow and Darkness",
    themeColor: "from-purple-600 to-gray-800",
    totalParticipants: 2654,
    elitePassHolders: 489,
    exclusiveRewards: [
      { name: "Shadow Reaper Scythe", icon: "🗡️", rarity: "legendary", type: "elite" },
      { name: "Phantom Wings", icon: "👻", rarity: "legendary", type: "elite" },
      { name: "Dark Orb Pet", icon: "🔮", rarity: "epic", type: "free" },
      { name: "Midnight Armor", icon: "🛡️", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 10,
    name: "Shadow Fall",
    month: "October",
    year: 2025,
    theme: "Halloween Special",
    themeColor: "from-orange-500 to-purple-700",
    totalParticipants: 3124,
    elitePassHolders: 678,
    exclusiveRewards: [
      { name: "Pumpkin King Crown", icon: "🎃", rarity: "legendary", type: "elite" },
      { name: "Spectral Horse", icon: "🐴", rarity: "legendary", type: "elite" },
      { name: "Bat Swarm Pet", icon: "🦇", rarity: "epic", type: "free" },
      { name: "Witch's Broom", icon: "🧹", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 9,
    name: "Autumn Winds",
    month: "September",
    year: 2025,
    theme: "Harvest Festival",
    themeColor: "from-amber-500 to-orange-600",
    totalParticipants: 2456,
    elitePassHolders: 412,
    exclusiveRewards: [
      { name: "Golden Harvest Blade", icon: "⚔️", rarity: "legendary", type: "elite" },
      { name: "Autumn Phoenix", icon: "🔥", rarity: "legendary", type: "elite" },
      { name: "Maple Leaf Crown", icon: "🍁", rarity: "epic", type: "free" },
      { name: "Scarecrow Companion", icon: "🎭", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 8,
    name: "Harvest Moon",
    month: "August",
    year: 2025,
    theme: "Lunar Celebration",
    themeColor: "from-yellow-400 to-amber-600",
    totalParticipants: 2789,
    elitePassHolders: 534,
    exclusiveRewards: [
      { name: "Moon Goddess Staff", icon: "🌙", rarity: "legendary", type: "elite" },
      { name: "Celestial Armor", icon: "✨", rarity: "legendary", type: "elite" },
      { name: "Star Rabbit Pet", icon: "🐰", rarity: "epic", type: "free" },
      { name: "Lantern Back Piece", icon: "🏮", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 7,
    name: "Summer Blaze",
    month: "July",
    year: 2025,
    theme: "Beach Party",
    themeColor: "from-yellow-400 to-red-500",
    totalParticipants: 3012,
    elitePassHolders: 621,
    exclusiveRewards: [
      { name: "Inferno Dragon", icon: "🐲", rarity: "legendary", type: "elite" },
      { name: "Blazing Armor Set", icon: "🔥", rarity: "legendary", type: "elite" },
      { name: "Sun Spirit Pet", icon: "☀️", rarity: "epic", type: "free" },
      { name: "Beach Surfboard", icon: "🏄", rarity: "rare", type: "free" },
    ],
  },
];

const rarityColors = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const SeasonHistory = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Season History | WOI Endgame"
        description="View past Game Pass seasons and their exclusive rewards in WOI Endgame."
      />
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container px-4">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
                <span className="text-primary">Season</span> History
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Explore past Game Pass seasons and their exclusive rewards. These items are no longer obtainable and are considered collector's treasures!
              </p>
            </motion.div>
          </div>

          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <Card className="bg-card border-primary/20">
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{pastSeasons.length}</div>
                <div className="text-sm text-muted-foreground">Past Seasons</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-primary/20">
              <CardContent className="pt-6 text-center">
                <Trophy className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {pastSeasons.reduce((acc, s) => acc + s.exclusiveRewards.filter(r => r.rarity === "legendary").length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Legendary Items</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-primary/20">
              <CardContent className="pt-6 text-center">
                <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {pastSeasons.reduce((acc, s) => acc + s.exclusiveRewards.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Exclusive Rewards</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-primary/20">
              <CardContent className="pt-6 text-center">
                <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {pastSeasons.reduce((acc, s) => acc + s.elitePassHolders, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Elite Pass Holders</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Season Cards */}
          <div className="space-y-6">
            {pastSeasons.map((season, index) => (
              <motion.div
                key={season.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="bg-card border-primary/20 overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${season.themeColor}`} />
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="text-xs">
                            Season {season.id}
                          </Badge>
                          <Badge className={`bg-gradient-to-r ${season.themeColor} text-white border-0`}>
                            {season.theme}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          {season.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {season.month} {season.year}
                        </p>
                      </div>

                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-foreground">{season.totalParticipants.toLocaleString()}</div>
                          <div className="text-muted-foreground text-xs">Participants</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-amber-500">{season.elitePassHolders.toLocaleString()}</div>
                          <div className="text-muted-foreground text-xs">Elite Holders</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="mb-3 flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Exclusive Rewards</span>
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">(No longer obtainable)</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {season.exclusiveRewards.map((reward, idx) => (
                        <div
                          key={idx}
                          className={`
                            p-3 rounded-lg border-2 flex flex-col items-center text-center
                            ${rarityColors[reward.rarity]}
                            ${reward.rarity === "legendary" ? "animate-pulse" : ""}
                          `}
                        >
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-3xl">{reward.icon}</span>
                            {reward.type === "elite" && (
                              <Crown className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          <span className="text-xs font-medium line-clamp-2">{reward.name}</span>
                          <Badge 
                            variant="outline" 
                            className={`mt-2 text-[10px] ${rarityColors[reward.rarity]}`}
                          >
                            {reward.rarity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Current Season CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30">
              <CardContent className="py-8">
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Don't Miss This Season!</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Join the current season now to earn exclusive rewards before they're gone forever.
                </p>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to="/dashboard">
                    View Current Season
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SeasonHistory;
