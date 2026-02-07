import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trophy,
  Lock,
  Gift,
  Crown,
  Medal,
  ChevronRight,
  Check,
  Coins,
  User,
  AlertCircle,
} from "lucide-react";
import {
  achievementsApi,
  UserAchievement,
  AchievementStats,
  NewlyUnlocked,
  GameCharacter,
} from "@/lib/achievementsApi";

// ---- Constants ----

const iconMap: Record<string, string> = {
  TROPHY: "🏆", STAR: "⭐", CROWN: "👑", MEDAL: "🎖️", FIRE: "🔥",
  BOLT: "⚡", GEM: "💎", COIN: "💰", GIFT: "🎁", HEART: "❤️",
  SHIELD: "🛡️", SWORD: "🗡️", VOTE: "🗳️", SPARKLE: "💫", TARGET: "🎯",
};

const getIcon = (icon: string) => iconMap[icon] || "🏆";

const rarityConfig = {
  common: { color: "text-slate-400", bg: "bg-slate-500/20", border: "border-slate-500/40", glow: "" },
  uncommon: { color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/40", glow: "shadow-emerald-500/20" },
  rare: { color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/40", glow: "shadow-cyan-500/25" },
  epic: { color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/40", glow: "shadow-purple-500/25" },
  legendary: { color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/40", glow: "shadow-amber-500/30" },
};

const categoryLabels: Record<string, string> = {
  voting: "Voting",
  purchases: "Purchases",
  gameplay: "Gameplay",
  social: "Social",
  events: "Events",
};

// ---- Confetti / Celebration ----

const ConfettiParticle = ({ delay, x, color }: { delay: number; x: number; color: string }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full pointer-events-none"
    style={{ backgroundColor: color, left: `${x}%`, top: "50%" }}
    initial={{ y: 0, opacity: 1, scale: 1 }}
    animate={{ y: [0, -100, -80], opacity: [1, 1, 0], x: [(Math.random() - 0.5) * 60] }}
    transition={{ duration: 0.8, delay }}
  />
);

const UnlockCelebration = ({ achievement, onClose }: { achievement: NewlyUnlocked; onClose: () => void }) => {
  const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;
  const colors = ["#06b6d4", "#f59e0b", "#a855f7", "#22c55e", "#ef4444"];

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className={`relative p-8 rounded-2xl border-2 ${rarity.border} ${rarity.bg} backdrop-blur-xl text-center max-w-sm mx-4`}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 0.03} x={30 + Math.random() * 40} color={colors[i % colors.length]} />
          ))}
        </div>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-6xl mb-4"
        >
          {getIcon(achievement.icon)}
        </motion.div>
        <Badge className={`mb-3 ${rarity.bg} ${rarity.color} border ${rarity.border}`}>
          {achievement.rarity.toUpperCase()}
        </Badge>
        <h3 className="text-xl font-bold mb-2">Achievement Unlocked!</h3>
        <p className={`text-lg font-semibold ${rarity.color}`}>{achievement.name}</p>
        {(achievement.reward_coins > 0 || achievement.reward_vip > 0) && (
          <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            {achievement.reward_coins > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Coins className="h-4 w-4" /> +{achievement.reward_coins.toLocaleString()}
              </span>
            )}
            {achievement.reward_vip > 0 && (
              <span className="flex items-center gap-1 text-purple-400">
                <Crown className="h-4 w-4" /> +{achievement.reward_vip.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ---- Achievement Item ----

const AchievementItem = ({
  achievement,
  onClaim,
  claiming,
}: {
  achievement: UserAchievement;
  onClaim: (id: number) => void;
  claiming: boolean;
}) => {
  const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;
  const canClaim = achievement.is_unlocked && !achievement.is_claimed;
  const hasReward = achievement.reward_coins > 0 || achievement.reward_vip > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-300
        ${achievement.is_unlocked ? rarity.border : "border-muted/30"}
        ${achievement.is_unlocked ? rarity.bg : "bg-muted/10"}
        ${achievement.is_unlocked && !achievement.is_claimed ? `shadow-lg ${rarity.glow}` : ""}
        ${!achievement.is_unlocked ? "opacity-60" : ""}
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`
          relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl
          ${achievement.is_unlocked ? rarity.bg : "bg-muted/20"}
          border ${achievement.is_unlocked ? rarity.border : "border-muted/30"}
        `}>
          {achievement.is_unlocked ? getIcon(achievement.icon) : <Lock className="h-6 w-6 text-muted-foreground/50" />}
          {achievement.is_claimed && (
            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-emerald-500 border-2 border-background">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold truncate ${achievement.is_unlocked ? rarity.color : "text-muted-foreground"}`}>
              {achievement.name}
            </h4>
            <Badge variant="outline" className={`text-[10px] px-1.5 ${rarity.color} ${rarity.border} shrink-0`}>
              {achievement.rarity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{achievement.description}</p>
          {!achievement.is_unlocked && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className={rarity.color}>
                  {achievement.current_value.toLocaleString()} / {achievement.requirement_value.toLocaleString()}
                </span>
              </div>
              <Progress value={achievement.progress_percent} className="h-1.5" />
            </div>
          )}
          {hasReward && achievement.is_unlocked && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {achievement.reward_coins > 0 && (
                <span className={`flex items-center gap-1 ${achievement.is_claimed ? "text-muted-foreground line-through" : "text-amber-400"}`}>
                  <Coins className="h-3 w-3" /> {achievement.reward_coins.toLocaleString()}
                </span>
              )}
              {achievement.reward_vip > 0 && (
                <span className={`flex items-center gap-1 ${achievement.is_claimed ? "text-muted-foreground line-through" : "text-purple-400"}`}>
                  <Crown className="h-3 w-3" /> {achievement.reward_vip.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
        {canClaim && hasReward && (
          <Button
            size="sm"
            onClick={() => onClaim(achievement.id)}
            disabled={claiming}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold shrink-0"
          >
            <Gift className="h-4 w-4 mr-1" />
            Claim
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// ---- Main Card ----

export const AchievementsCard = () => {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [charsLoading, setCharsLoading] = useState(true);

  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>({ total: 0, unlocked: 0, claimed: 0, unclaimed: 0 });
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [celebration, setCelebration] = useState<NewlyUnlocked | null>(null);

  // Fetch characters on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setCharsLoading(true);
      try {
        const chars = await achievementsApi.getMyCharacters();
        if (cancelled) return;
        setCharacters(chars);
        if (chars.length > 0 && !selectedRoleId) {
          setSelectedRoleId(chars[0].RoleID);
        }
      } catch (e) {
        console.error("Failed to fetch characters:", e);
      } finally {
        if (!cancelled) setCharsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch achievements when character changes
  const fetchAchievements = async (roleId: number) => {
    setLoading(true);
    try {
      const data = await achievementsApi.getUserProgress(roleId);
      setAchievements(Array.isArray(data?.achievements) ? data.achievements : []);
      setStats(data?.stats || { total: 0, unlocked: 0, claimed: 0, unclaimed: 0 });
    } catch (e) {
      console.error("Failed to fetch achievements:", e);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewUnlocks = async (roleId: number) => {
    try {
      const result = await achievementsApi.checkUnlocks(roleId);
      if (result.count > 0 && result.newlyUnlocked.length > 0) {
        setCelebration(result.newlyUnlocked[0]);
        fetchAchievements(roleId);
      }
    } catch (e) {
      console.error("Failed to check unlocks:", e);
    }
  };

  useEffect(() => {
    if (!selectedRoleId) return;
    fetchAchievements(selectedRoleId);
    const timer = setTimeout(() => checkForNewUnlocks(selectedRoleId), 2000);
    return () => clearTimeout(timer);
  }, [selectedRoleId]);

  const handleClaim = async (achievementId: number) => {
    if (!selectedRoleId) return;
    setClaiming(true);
    try {
      const result = await achievementsApi.claimReward(achievementId, selectedRoleId);
      if (result.success) {
        toast.success("🎉 Reward claimed!", {
          description: `+${result.coins.toLocaleString()} Coins, +${result.vip.toLocaleString()} VIP Points`,
        });
        fetchAchievements(selectedRoleId);
      } else {
        toast.error("Failed to claim", { description: result.error });
      }
    } catch (e) {
      toast.error("Connection error");
    } finally {
      setClaiming(false);
    }
  };

  const handleCharacterChange = (value: string) => {
    setSelectedRoleId(parseInt(value, 10));
  };

  // Preview items
  const recentUnlocked = achievements.filter(a => a.is_unlocked).slice(-3).reverse();
  const nearCompletion = achievements
    .filter(a => !a.is_unlocked && a.progress_percent >= 50)
    .sort((a, b) => b.progress_percent - a.progress_percent)
    .slice(0, 2);
  const previewAchievements = [...recentUnlocked, ...nearCompletion].slice(0, 3);

  // Filtered for modal
  const filteredAchievements = achievements.filter(a =>
    activeCategory === "all" || a.category === activeCategory
  );
  const categories = ["all", ...new Set(achievements.map(a => a.category))];

  const selectedChar = characters.find(c => c.RoleID === selectedRoleId);

  return (
    <>
      {/* Celebration Modal */}
      <AnimatePresence>
        {celebration && (
          <UnlockCelebration achievement={celebration} onClose={() => setCelebration(null)} />
        )}
      </AnimatePresence>

      {/* Main Card */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-card/80">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Trophy className="h-5 w-5 text-amber-400" />
              </div>
              Achievements
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)} className="text-xs hover:bg-primary/10">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Character Selector */}
          {charsLoading ? (
            <Skeleton className="h-9 w-full mt-3" />
          ) : characters.length === 0 ? (
            <div className="mt-3 p-2.5 bg-muted/50 rounded-lg flex items-center gap-2 text-muted-foreground text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              No characters found. Create one in-game first.
            </div>
          ) : (
            <div className="mt-3">
              <Select value={selectedRoleId?.toString() || ""} onValueChange={handleCharacterChange}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Select character..." />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((char) => (
                    <SelectItem key={char.RoleID} value={char.RoleID.toString()}>
                      <span className="font-medium">{char.Name}</span>
                      <span className="text-muted-foreground text-xs ml-2">Lv.{char.Level}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stats Bar */}
          {selectedRoleId && (
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                <Medal className="h-4 w-4 text-amber-400" />
                <span className="font-bold">{stats.unlocked}</span>
                <span className="text-muted-foreground">/ {stats.total}</span>
              </div>
              {stats.unclaimed > 0 && (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black animate-pulse">
                  <Gift className="h-3 w-3 mr-1" />
                  {stats.unclaimed} to claim
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {!selectedRoleId ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Select a character to view achievements
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : previewAchievements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Start playing to unlock achievements!</p>
            </div>
          ) : (
            previewAchievements.map(ach => (
              <AchievementItem key={ach.id} achievement={ach} onClaim={handleClaim} claiming={claiming} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Full Achievements Modal */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 bg-card/95 backdrop-blur-xl border-primary/20">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Trophy className="h-6 w-6 text-amber-400" />
              </div>
              All Achievements
              {selectedChar && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  — {selectedChar.Name} (Lv.{selectedChar.Level})
                </span>
              )}
              <Badge variant="outline" className="ml-auto">
                {stats.unlocked} / {stats.total}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="px-6">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
              {categories.map(cat => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  {cat === "all" ? "All" : categoryLabels[cat] || cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[55vh] pr-4">
              <div className="space-y-3 pb-6">
                {filteredAchievements.map(ach => (
                  <AchievementItem key={ach.id} achievement={ach} onClaim={handleClaim} claiming={claiming} />
                ))}
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
