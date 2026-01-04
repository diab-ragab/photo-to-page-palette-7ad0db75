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
  Clock,
  ArrowLeft,
} from "lucide-react";

interface SeasonReward {
  name: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  type: "free" | "elite";
}

interface UpcomingSeason {
  id: number;
  name: string;
  month: string;
  year: number;
  theme: string;
  themeColor: string;
  plannedRewards: SeasonReward[];
  startsIn?: string;
}

const upcomingSeasons: UpcomingSeason[] = [
  {
    id: 2,
    name: "Frost Bite",
    month: "February",
    year: 2026,
    theme: "Arctic Expedition",
    themeColor: "from-cyan-400 to-blue-600",
    startsIn: "Next Month",
    plannedRewards: [
      { name: "Ice Titan Mount", icon: "🦣", rarity: "legendary", type: "elite" },
      { name: "Frozen Crown", icon: "❄️", rarity: "legendary", type: "elite" },
      { name: "Snowstorm Pet", icon: "⛄", rarity: "epic", type: "free" },
      { name: "Frost Armor", icon: "🧊", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 3,
    name: "Spring Awakening",
    month: "March",
    year: 2026,
    theme: "Nature's Rebirth",
    themeColor: "from-green-400 to-emerald-600",
    plannedRewards: [
      { name: "Forest Guardian Mount", icon: "🦌", rarity: "legendary", type: "elite" },
      { name: "Bloom Crown", icon: "🌸", rarity: "legendary", type: "elite" },
      { name: "Butterfly Swarm Pet", icon: "🦋", rarity: "epic", type: "free" },
      { name: "Vine Armor", icon: "🌿", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 4,
    name: "Blossom Fury",
    month: "April",
    year: 2026,
    theme: "Cherry Blossom Festival",
    themeColor: "from-pink-400 to-rose-600",
    plannedRewards: [
      { name: "Sakura Dragon", icon: "🐲", rarity: "legendary", type: "elite" },
      { name: "Petal Wings", icon: "🌺", rarity: "legendary", type: "elite" },
      { name: "Koi Fish Pet", icon: "🐟", rarity: "epic", type: "free" },
      { name: "Blossom Robe", icon: "👘", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 5,
    name: "Sunfire",
    month: "May",
    year: 2026,
    theme: "Solar Eclipse",
    themeColor: "from-orange-400 to-red-600",
    plannedRewards: [
      { name: "Solar Phoenix", icon: "🔥", rarity: "legendary", type: "elite" },
      { name: "Sun God Helm", icon: "☀️", rarity: "legendary", type: "elite" },
      { name: "Flame Spirit Pet", icon: "🌟", rarity: "epic", type: "free" },
      { name: "Ember Cloak", icon: "🧥", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 6,
    name: "Summer Blaze",
    month: "June",
    year: 2026,
    theme: "Tropical Paradise",
    themeColor: "from-yellow-400 to-orange-500",
    plannedRewards: [
      { name: "Tidal Serpent Mount", icon: "🐍", rarity: "legendary", type: "elite" },
      { name: "Ocean King Trident", icon: "🔱", rarity: "legendary", type: "elite" },
      { name: "Crab Companion", icon: "🦀", rarity: "epic", type: "free" },
      { name: "Beach Warrior Set", icon: "🏖️", rarity: "rare", type: "free" },
    ],
  },
  {
    id: 7,
    name: "Thunder Storm",
    month: "July",
    year: 2026,
    theme: "Lightning Gods",
    themeColor: "from-indigo-500 to-purple-700",
    plannedRewards: [
      { name: "Storm Dragon", icon: "⚡", rarity: "legendary", type: "elite" },
      { name: "Thunder God Armor", icon: "🌩️", rarity: "legendary", type: "elite" },
      { name: "Electric Sprite Pet", icon: "💫", rarity: "epic", type: "free" },
      { name: "Lightning Staff", icon: "🪄", rarity: "rare", type: "free" },
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
        title="Upcoming Seasons | WOI Endgame"
        description="Preview upcoming Game Pass seasons and their exclusive rewards in WOI Endgame."
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
                <span className="text-primary">Upcoming</span> Seasons
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Preview upcoming Game Pass seasons and their planned exclusive rewards. Get ready to collect these amazing items!
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
                <div className="text-2xl font-bold">{upcomingSeasons.length}</div>
                <div className="text-sm text-muted-foreground">Upcoming Seasons</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-primary/20">
              <CardContent className="pt-6 text-center">
                <Trophy className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {upcomingSeasons.reduce((acc, s) => acc + s.plannedRewards.filter(r => r.rarity === "legendary").length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Legendary Items</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-primary/20">
              <CardContent className="pt-6 text-center">
                <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {upcomingSeasons.reduce((acc, s) => acc + s.plannedRewards.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Planned Rewards</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-primary/20">
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">6</div>
                <div className="text-sm text-muted-foreground">Months Ahead</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Season Cards */}
          <div className="space-y-6">
            {upcomingSeasons.map((season, index) => (
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
                          {season.startsIn && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <Clock className="h-3 w-3 mr-1" />
                              {season.startsIn}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          {season.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {season.month} {season.year}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="mb-3 flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Planned Rewards</span>
                      <Badge variant="outline" className="text-xs">Preview</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {season.plannedRewards.map((reward, idx) => (
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
                <h3 className="text-xl font-bold mb-2">Join the Current Season!</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Don't wait for the next season - start earning exclusive rewards today!
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
