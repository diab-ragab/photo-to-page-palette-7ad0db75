import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet, apiPost, type FetchJsonError } from "@/lib/apiFetch";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CharacterSelector } from "@/components/shop/CharacterSelector";
import { ElitePassUpsell } from "@/components/ElitePassUpsell";
import {
  Crown,
  Lock,
  Gift,
  Coins,
  Star,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  History,
  User,
  Unlock,
  Zap,
  Trophy,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Confetti Particle Component
const ConfettiParticle = ({ delay, x, color }: { delay: number; x: number; color: string }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full pointer-events-none"
    style={{ backgroundColor: color, left: `${x}%` }}
    initial={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
    animate={{
      y: [0, -80, -60],
      opacity: [1, 1, 0],
      scale: [1, 1.2, 0.5],
      rotate: [0, 180, 360],
      x: [0, (Math.random() - 0.5) * 100],
    }}
    transition={{
      duration: 0.8,
      delay: delay,
      ease: "easeOut",
    }}
  />
);

const ConfettiBurst = ({ show, onComplete }: { show: boolean; onComplete: () => void }) => {
  const colors = ["#06b6d4", "#f59e0b", "#a855f7", "#22c55e", "#ef4444", "#3b82f6"];
  
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {Array.from({ length: 20 }).map((_, i) => (
        <ConfettiParticle
          key={i}
          delay={i * 0.02}
          x={30 + Math.random() * 40}
          color={colors[Math.floor(Math.random() * colors.length)]}
        />
      ))}
    </div>
  );
};

// Sparkle burst effect
const SparkleEffect = ({ show }: { show: boolean }) => {
  if (!show) return null;
  
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.5 }}
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 w-1 h-1 bg-amber-400 rounded-full"
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos((i * Math.PI * 2) / 8) * 50,
            y: Math.sin((i * Math.PI * 2) / 8) * 50,
            opacity: 0,
            scale: [1, 2, 0],
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
};

// Calculate time until next month reset
const getSeasonResetTime = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const diff = nextMonth.getTime() - now.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, totalMs: diff };
};

const getSeasonName = () => {
  const month = new Date().getMonth();
  const monthNames = [
    "Winter Storm", "Frost Bite", "Spring Awakening", "Blossom Fury",
    "Sunfire", "Summer Blaze", "Harvest Moon", "Autumn Winds",
    "Shadow Fall", "Dark Harvest", "Frost Legion", "Winter's End"
  ];
  return monthNames[month];
};

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface ApiReward {
  id: number;
  day: number;
  tier: "free" | "elite" | "gold";
  item_id: number;
  item_name: string;
  quantity: number;
  coins: number;
  zen: number;
  exp: number;
  rarity: Rarity;
  icon: string;
}

interface PassReward {
  day: number;
  freeReward: {
    type: "coins" | "vip_points" | "item";
    name: string;
    amount?: number;
    icon: string;
    rarity?: Rarity;
  };
  eliteReward: {
    type: "coins" | "vip_points" | "item";
    name: string;
    amount?: number;
    icon: string;
    rarity?: Rarity;
  };
  goldReward: {
    type: "coins" | "vip_points" | "item";
    name: string;
    amount?: number;
    icon: string;
    rarity?: Rarity;
  };
}

interface ZenSkipConfirm {
  day: number;
  zenCost: number;
  rewardName: string;
}

// Convert API rewards to PassReward format
const convertApiRewards = (apiRewards: ApiReward[]): PassReward[] => {
  const rewards: PassReward[] = [];
  const rewardsByDay: Record<number, { free?: ApiReward; elite?: ApiReward; gold?: ApiReward }> = {};
  
  apiRewards.forEach(reward => {
    if (!rewardsByDay[reward.day]) {
      rewardsByDay[reward.day] = {};
    }
    if (reward.tier === "free") {
      rewardsByDay[reward.day].free = reward;
    } else if (reward.tier === "elite") {
      rewardsByDay[reward.day].elite = reward;
    } else if (reward.tier === "gold") {
      rewardsByDay[reward.day].gold = reward;
    }
  });
  
  const makeRewardDisplay = (r: ApiReward | undefined, defaultIcon: string): PassReward["freeReward"] => {
    if (!r) return { name: "Coming Soon", icon: defaultIcon, type: "item", rarity: "common" };
    const rewardType: "coins" | "vip_points" | "item" = r.coins > 0 ? "coins" : r.zen > 0 ? "vip_points" : "item";
    return {
      name: r.item_name,
      icon: r.icon,
      type: rewardType,
      amount: r.coins > 0 ? r.coins : r.zen > 0 ? r.zen : undefined,
      rarity: r.rarity,
    };
  };

  for (let day = 1; day <= 30; day++) {
    const dayRewards = rewardsByDay[day];
    rewards.push({
      day,
      freeReward: makeRewardDisplay(dayRewards?.free, "🎁"),
      eliteReward: makeRewardDisplay(dayRewards?.elite, "👑"),
      goldReward: makeRewardDisplay(dayRewards?.gold, "💎"),
    });
  }
  
  return rewards;
};

const rarityStyles: Record<Rarity, { border: string; bg: string; glow: string; text: string }> = {
  common: {
    border: "border-slate-400/40",
    bg: "from-slate-500/20 to-slate-700/10",
    glow: "",
    text: "text-slate-300",
  },
  uncommon: {
    border: "border-emerald-500/50",
    bg: "from-emerald-500/25 to-emerald-900/10",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.25)]",
    text: "text-emerald-400",
  },
  rare: {
    border: "border-cyan-400/60",
    bg: "from-cyan-500/30 to-cyan-900/10",
    glow: "shadow-[0_0_25px_rgba(34,211,238,0.3)]",
    text: "text-cyan-300",
  },
  epic: {
    border: "border-purple-500/60",
    bg: "from-purple-500/30 to-purple-900/10",
    glow: "shadow-[0_0_25px_rgba(168,85,247,0.35)]",
    text: "text-purple-400",
  },
  legendary: {
    border: "border-amber-400/70",
    bg: "from-amber-500/35 to-orange-900/15",
    glow: "shadow-[0_0_30px_rgba(251,191,36,0.4)]",
    text: "text-amber-300",
  },
};

const iconMap: Record<string, string> = {
  "GIFT": "🎁", "GEM": "💎", "CROWN": "👑", "TROPHY": "🏆", "STAR": "⭐",
  "COIN": "💰", "FIRE": "🔥", "BOLT": "⚡", "HEART": "❤️", "TARGET": "🎯",
  "GAME": "🎮", "DICE": "🎲", "MEDAL": "🎖️", "GOLD": "🥇", "SILVER": "🥈",
  "BRONZE": "🥉", "SPARKLE": "💫", "RAINBOW": "🌈", "CLOVER": "🍀", "ORB": "🔮",
  "SWORD": "🗡️", "SHIELD": "🛡️", "POTION": "🧪", "SCROLL": "📜",
};

const getIconDisplay = (icon: string): string => iconMap[icon] || icon;

export const GamePass = () => {
  const { user, logout } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasElitePass, setHasElitePass] = useState(false);
  const [claimedDays, setClaimedDays] = useState<{ free: number[]; elite: number[]; gold: number[] }>({ free: [], elite: [], gold: [] });
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getSeasonResetTime());
  const [rewards, setRewards] = useState<PassReward[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null);
  const [userZen, setUserZen] = useState(0);
  const [zenCostPerDay, setZenCostPerDay] = useState(100000);
  const [zenSkipConfirm, setZenSkipConfirm] = useState<ZenSkipConfirm | null>(null);
  const [claimAnimation, setClaimAnimation] = useState<{ day: number; tier: "free" | "elite" | "gold" } | null>(null);
  const [userTier, setUserTier] = useState<"free" | "elite" | "gold">("free");

  const handleCharacterSelect = (roleId: number | null, name: string | null) => {
    setSelectedRoleId(roleId);
    setSelectedCharacterName(name);
  };

  const clearClaimAnimation = useCallback(() => {
    setClaimAnimation(null);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getSeasonResetTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchRewards = async () => {
      setIsLoadingRewards(true);
      try {
        const data = await apiGet<any>(`/gamepass.php?action=rewards&rid=${Date.now()}`, false, {
          showErrorToast: false,
        });

        if (data?.success && Array.isArray(data.rewards) && data.rewards.length > 0) {
          setRewards(convertApiRewards(data.rewards));
          if (data.current_day) setCurrentDay(data.current_day);
        }
      } catch {
        // silent (landing page should still render)
      } finally {
        setIsLoadingRewards(false);
      }
    };

    fetchRewards();
  }, []);

  useEffect(() => {
    const fetchUserPassStatus = async () => {
      if (!user) return;

      const token = localStorage.getItem("woi_session_token") || localStorage.getItem("sessionToken");
      if (!token) return;

      try {
        const data = await apiGet<any>(
          `/gamepass.php?action=status&rid=${Date.now()}&sessionToken=${encodeURIComponent(token)}`,
          true,
          { showErrorToast: false, silentStatuses: [401, 403] },
        );

        if (data?.success) {
          setHasElitePass(!!data.is_premium);
          const tier = data.user_tier || (data.is_premium ? 'elite' : 'free');
          setUserTier(tier as "free" | "elite" | "gold");
          setClaimedDays({ free: data.claimed_days?.free || [], elite: data.claimed_days?.elite || [], gold: data.claimed_days?.gold || [] });
          if (data.current_day) setCurrentDay(data.current_day);
          if (data.user_zen !== undefined) setUserZen(data.user_zen);
          if (data.zen_cost_per_day && data.zen_cost_per_day > 0) setZenCostPerDay(data.zen_cost_per_day);
          if (Array.isArray(data.rewards) && data.rewards.length > 0) setRewards(convertApiRewards(data.rewards));
        }
      } catch (err) {
        const status = (err as FetchJsonError)?.status;
        if (status === 401 || status === 403) {
          logout();
        }
      }
    };

    fetchUserPassStatus();
  }, [user, logout]);

  // Scroll to current day on mount
  useEffect(() => {
    if (scrollRef.current && currentDay > 3) {
      const cardWidth = 140;
      const scrollTo = (currentDay - 2) * cardWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  }, [currentDay, rewards.length]);

  const claimReward = async (day: number, tier: "free" | "elite" | "gold", payWithZen: boolean = false) => {
    if (claimedDays[tier].includes(day)) return;
    if (tier === "elite" && userTier === "free") return;
    if (tier === "gold" && userTier !== "gold") return;

    if (tier === "free" && day > currentDay && !payWithZen) {
      const daysAhead = day - currentDay;
      const zenCost = daysAhead * zenCostPerDay;
      const reward = rewards.find(r => r.day === day);
      setZenSkipConfirm({ day, zenCost, rewardName: reward?.freeReward.name || "Reward" });
      return;
    }

    if (!selectedRoleId) {
      toast.error("Select a character", { description: "Please select a character to receive the reward." });
      return;
    }

    // Require a session token for state-changing actions.
    // (Some hosting setups can strip auth headers; we also include sessionToken in body as a fallback.)
    const sessionToken =
      localStorage.getItem("woi_session_token") ||
      localStorage.getItem("sessionToken") ||
      "";

    if (!sessionToken) {
      toast.error("Not logged in", { description: "Please log in again, then try claiming the reward." });
      logout();
      return;
    }

    setLoading(true);
    try {
      // Include key params in URL as fallback (some proxies drop POST bodies)
      const claimParams = new URLSearchParams({
        action: "claim",
        rid: String(Date.now()),
        sessionToken,
        day: String(day),
        tier,
        roleId: String(selectedRoleId),
        payWithZen: payWithZen ? "1" : "0",
      });

      const data = await apiPost<any>(
        `/gamepass.php?${claimParams.toString()}`,
        { day, tier, roleId: selectedRoleId, payWithZen, sessionToken },
        true,
        { showErrorToast: false, silentStatuses: [401, 403] },
      );

      if (data?.success) {
        setClaimAnimation({ day, tier });
        setClaimedDays(prev => ({ ...prev, [tier]: [...prev[tier], day] }));
        if (data.user_zen !== undefined) setUserZen(data.user_zen);
        const zenMsg = data.zen_spent ? ` (-${data.zen_spent.toLocaleString()} Zen)` : "";
        toast.success("🎉 Reward claimed!", {
          description: `Sent to ${selectedCharacterName || "your character"}!${zenMsg}`,
        });
      } else {
        const errText = (data?.error || data?.message || "Please try again.") as string;
        if (/not authenticated/i.test(errText)) {
          toast.error("Not authenticated", { description: "Please log in again." });
          logout();
          return;
        }
        toast.error("Failed to claim", { description: errText });
      }
    } catch (err) {
      const status = (err as FetchJsonError)?.status;
      if (status === 401 || status === 403) {
        toast.error("Session expired", { description: "Please log in again." });
        logout();
        return;
      }
      const serverMsg = (err as FetchJsonError)?.serverMessage;
      toast.error("Failed to claim", { description: serverMsg || "Connection error – please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmZenSkip = () => {
    if (zenSkipConfirm) {
      claimReward(zenSkipConfirm.day, "free", true);
      setZenSkipConfirm(null);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 420;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const progressPercent = (currentDay / 30) * 100;
  const totalFreeClaimed = claimedDays.free.length;
  const totalEliteClaimed = claimedDays.elite.length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-background via-card to-background">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[60px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Title & Season */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-cyan-500 rounded-xl blur-lg opacity-50" />
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/30 to-cyan-500/20 border border-primary/40 backdrop-blur-sm">
                  <Trophy className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Game Pass</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 text-primary">
                    <Calendar className="h-3 w-3 mr-1" />
                    {getSeasonName()}
                  </Badge>
                  {userTier === "elite" && (
                    <Badge className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-bold text-xs animate-pulse">
                      <Crown className="h-3 w-3 mr-1" />
                      Elite Active
                    </Badge>
                  )}
                  {userTier === "gold" && (
                    <Badge className="bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-500 text-white font-bold text-xs animate-pulse">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Gold Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                <Gift className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Free:</span>
                <span className="font-bold text-foreground">{totalFreeClaimed}/30</span>
              </div>
              {userTier !== "free" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Crown className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-300/70">Elite:</span>
                  <span className="font-bold text-amber-300">{totalEliteClaimed}/30</span>
                </div>
              )}
              {userTier === "gold" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span className="text-violet-300/70">Gold:</span>
                  <span className="font-bold text-violet-300">{claimedDays.gold.length}/30</span>
                </div>
              )}
              {user && userZen > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <Coins className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-cyan-300">{userZen.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timer & Actions */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
              <span className="text-muted-foreground">Resets in</span>
              <div className="flex gap-1">
                {[
                  { v: timeLeft.days, l: "d" },
                  { v: String(timeLeft.hours).padStart(2, "0"), l: "h" },
                  { v: String(timeLeft.minutes).padStart(2, "0"), l: "m" },
                  { v: String(timeLeft.seconds).padStart(2, "0"), l: "s" },
                ].map((t, i) => (
                  <div key={i} className="px-2 py-1 rounded-md bg-muted/80 border border-border/50 font-mono text-sm font-bold">
                    {t.v}<span className="text-muted-foreground text-xs">{t.l}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="text-xs hover:bg-primary/10 hover:text-primary">
                <Link to="/seasons">
                  <History className="h-3 w-3 mr-1" />
                  Past Seasons
                </Link>
              </Button>
              {userTier === "free" && (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-black font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-105"
                  onClick={() => toast.info("Visit the Shop to purchase Elite or Gold Pass", { action: { label: "Go to Shop", onClick: () => window.location.href = "/shop" } })}
                >
                  <Crown className="h-4 w-4 mr-1" />
                  Upgrade Pass
                  <Sparkles className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Day <span className="font-bold text-foreground">{currentDay}</span> of 30
            </span>
            <span className="font-bold text-primary">{Math.round(progressPercent)}%</span>
          </div>
          <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-cyan-400 to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/50 via-cyan-400/50 to-primary/50 blur-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Character Selector */}
        {user && (
          <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Deliver Rewards To</span>
              {selectedCharacterName && (
                <Badge variant="outline" className="ml-auto text-xs border-primary/40 text-primary bg-primary/10">
                  <Zap className="h-3 w-3 mr-1" />
                  {selectedCharacterName}
                </Badge>
              )}
            </div>
            <CharacterSelector onSelect={handleCharacterSelect} selectedRoleId={selectedRoleId} />
          </div>
        )}
      </div>

      {/* Pass Upsell Banner */}
      {userTier !== "gold" && (
        <div className="mb-6">
          <ElitePassUpsell compact currentTier={userTier} />
        </div>
      )}

      {/* Pass Track */}
      <div className="relative z-10 pb-6">
        {/* Navigation Buttons */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="h-10 w-10 rounded-full bg-background/90 border-primary/30 hover:bg-primary/20 hover:border-primary shadow-lg backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="h-10 w-10 rounded-full bg-background/90 border-primary/30 hover:bg-primary/20 hover:border-primary shadow-lg backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-14 py-4 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {rewards.map((reward, index) => {
            const day = reward.day;
            const isCurrentDay = day === currentDay;
            const isPast = day < currentDay;
            const isFuture = day > currentDay;
            
            const freeRarity = reward.freeReward.rarity || "common";
            const eliteRarity = reward.eliteReward.rarity || "rare";
            const goldRarity = reward.goldReward.rarity || "legendary";
            const freeClaimed = claimedDays.free.includes(day);
            const eliteClaimed = claimedDays.elite.includes(day);
            const goldClaimed = claimedDays.gold.includes(day);
            const freeAvailable = (isPast || isCurrentDay) && !freeClaimed;
            const canClaimElite = userTier === "elite" || userTier === "gold";
            const canClaimGold = userTier === "gold";
            const eliteAvailable = (isPast || isCurrentDay) && !eliteClaimed && canClaimElite;
            const goldAvailable = (isPast || isCurrentDay) && !goldClaimed && canClaimGold;
            
            // Calculate Zen cost only for future days
            const daysAhead = isFuture ? (day - currentDay) : 0;
            const zenCost = daysAhead * zenCostPerDay;
            const showZenSkip = isFuture && !freeClaimed && user && zenCost > 0;

            const isAnimatingFree = claimAnimation?.day === day && claimAnimation?.tier === "free";
            const isAnimatingElite = claimAnimation?.day === day && claimAnimation?.tier === "elite";
            const isAnimatingGold = claimAnimation?.day === day && claimAnimation?.tier === "gold";

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex-shrink-0 w-32 ${isCurrentDay ? "scale-105" : ""}`}
              >
                {/* Day Indicator */}
                <div className={`text-center mb-2 ${isCurrentDay ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  <div className="text-xs uppercase tracking-wider">Day</div>
                  <div className={`text-lg font-bold ${isCurrentDay ? "text-primary" : ""}`}>{day}</div>
                </div>

                {/* Reward Stack */}
                <div className="relative space-y-2">
                  {/* Gold Reward */}
                  <motion.button
                    whileHover={goldAvailable ? { scale: 1.05, y: -2 } : {}}
                    whileTap={goldAvailable ? { scale: 0.98 } : {}}
                    onClick={() => goldAvailable && claimReward(day, "gold")}
                    disabled={!goldAvailable || loading}
                    className={`
                      relative w-full aspect-[4/5] rounded-xl border-2 overflow-hidden transition-all duration-300
                      bg-gradient-to-br from-violet-500/30 to-fuchsia-900/10 border-violet-500/60
                      ${goldAvailable ? "cursor-pointer hover:shadow-[0_0_25px_rgba(139,92,246,0.35)]" : ""}
                      ${!canClaimGold ? "grayscale opacity-40" : ""}
                      ${goldClaimed ? "opacity-60" : ""}
                      ${isCurrentDay && canClaimGold && !goldClaimed ? "shadow-[0_0_25px_rgba(139,92,246,0.35)]" : ""}
                    `}
                  >
                    <ConfettiBurst show={isAnimatingGold} onComplete={clearClaimAnimation} />
                    <SparkleEffect show={isAnimatingGold} />
                    <div className="absolute top-1 left-1 z-10">
                      <div className="p-1 rounded-md bg-violet-500/90 shadow-lg">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    {!canClaimGold && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <Lock className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    {goldClaimed && (
                      <motion.div
                        initial={isAnimatingGold ? { scale: 0 } : { scale: 1 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm"
                      >
                        <motion.div
                          initial={isAnimatingGold ? { scale: 0, rotate: -180 } : { scale: 1, rotate: 0 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="p-2 rounded-full bg-emerald-500/60 border-2 border-emerald-400"
                        >
                          <Check className="h-5 w-5 text-white" />
                        </motion.div>
                      </motion.div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                      <span className="text-3xl drop-shadow-lg">{getIconDisplay(reward.goldReward.icon)}</span>
                      <span className={`text-[10px] mt-1 text-center line-clamp-2 font-medium ${rarityStyles[goldRarity].text}`}>
                        {reward.goldReward.name}
                      </span>
                    </div>
                    {goldAvailable && !goldClaimed && (
                      <div className="absolute inset-0 bg-gradient-to-t from-violet-500/30 via-transparent to-transparent animate-pulse" />
                    )}
                  </motion.button>

                  <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-2 bg-gradient-to-b from-border to-transparent" />
                  {/* Elite Reward */}
                  <motion.button
                    whileHover={eliteAvailable ? { scale: 1.05, y: -2 } : {}}
                    whileTap={eliteAvailable ? { scale: 0.98 } : {}}
                    onClick={() => eliteAvailable && claimReward(day, "elite")}
                    disabled={!eliteAvailable || loading}
                    className={`
                      relative w-full aspect-[4/5] rounded-xl border-2 overflow-hidden transition-all duration-300
                      bg-gradient-to-br ${rarityStyles[eliteRarity].bg} ${rarityStyles[eliteRarity].border}
                      ${eliteAvailable ? `cursor-pointer hover:${rarityStyles[eliteRarity].glow}` : ""}
                      ${!canClaimElite ? "grayscale opacity-40" : ""}
                      ${eliteClaimed ? "opacity-60" : ""}
                      ${isCurrentDay && canClaimElite && !eliteClaimed ? rarityStyles[eliteRarity].glow : ""}
                    `}
                  >
                    {/* Confetti Effect */}
                    <ConfettiBurst show={isAnimatingElite} onComplete={clearClaimAnimation} />
                    <SparkleEffect show={isAnimatingElite} />

                    {/* Elite Badge */}
                    <div className="absolute top-1 left-1 z-10">
                      <div className="p-1 rounded-md bg-amber-500/90 shadow-lg">
                        <Crown className="h-3 w-3 text-black" />
                      </div>
                    </div>

                    {/* Lock Overlay */}
                    {!canClaimElite && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <Lock className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}

                    {/* Claimed Overlay */}
                    {eliteClaimed && (
                      <motion.div
                        initial={isAnimatingElite ? { scale: 0 } : { scale: 1 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm"
                      >
                        <motion.div
                          initial={isAnimatingElite ? { scale: 0, rotate: -180 } : { scale: 1, rotate: 0 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="p-2 rounded-full bg-emerald-500/60 border-2 border-emerald-400"
                        >
                          <Check className="h-5 w-5 text-white" />
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                      <span className="text-3xl drop-shadow-lg">{getIconDisplay(reward.eliteReward.icon)}</span>
                      <span className={`text-[10px] mt-1 text-center line-clamp-2 font-medium ${rarityStyles[eliteRarity].text}`}>
                        {reward.eliteReward.name}
                      </span>
                    </div>

                    {/* Available Glow */}
                    {eliteAvailable && !eliteClaimed && (
                      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/30 via-transparent to-transparent animate-pulse" />
                    )}
                  </motion.button>

                  {/* Connector Line */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-2 bg-gradient-to-b from-border to-transparent" />

                  {/* Free Reward */}
                  <motion.button
                    whileHover={(freeAvailable || showZenSkip) ? { scale: 1.05, y: -2 } : {}}
                    whileTap={(freeAvailable || showZenSkip) ? { scale: 0.98 } : {}}
                    onClick={() => !freeClaimed && (freeAvailable || isFuture) && claimReward(day, "free")}
                    disabled={loading || freeClaimed || (!freeAvailable && !isFuture)}
                    className={`
                      relative w-full aspect-[4/5] rounded-xl border-2 overflow-hidden transition-all duration-300
                      bg-gradient-to-br ${rarityStyles[freeRarity].bg} ${rarityStyles[freeRarity].border}
                      ${freeAvailable ? `cursor-pointer hover:${rarityStyles[freeRarity].glow}` : ""}
                      ${showZenSkip ? "cursor-pointer hover:border-amber-400/50" : ""}
                      ${freeClaimed ? "opacity-60" : ""}
                      ${isFuture && !user ? "opacity-40" : ""}
                      ${isCurrentDay && !freeClaimed ? rarityStyles[freeRarity].glow : ""}
                    `}
                  >
                    {/* Confetti Effect */}
                    <ConfettiBurst show={isAnimatingFree} onComplete={clearClaimAnimation} />
                    <SparkleEffect show={isAnimatingFree} />

                    {/* Free Badge */}
                    <div className="absolute top-1 left-1 z-10">
                      <div className="p-1 rounded-md bg-primary/80 shadow-lg">
                        <Gift className="h-3 w-3 text-white" />
                      </div>
                    </div>

                    {/* Zen Skip Badge - Only show for future days with cost > 0 */}
                    {showZenSkip && (
                      <div className="absolute top-1 right-1 z-10">
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-black text-[9px] font-bold shadow-lg">
                          <Unlock className="h-2.5 w-2.5" />
                          {zenCost >= 1000000 
                            ? `${(zenCost / 1000000).toFixed(1)}M`
                            : `${(zenCost / 1000).toFixed(0)}k`
                          }
                        </div>
                      </div>
                    )}

                    {/* Claimed Overlay */}
                    {freeClaimed && (
                      <motion.div
                        initial={isAnimatingFree ? { scale: 0 } : { scale: 1 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm"
                      >
                        <motion.div
                          initial={isAnimatingFree ? { scale: 0, rotate: -180 } : { scale: 1, rotate: 0 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="p-2 rounded-full bg-emerald-500/60 border-2 border-emerald-400"
                        >
                          <Check className="h-5 w-5 text-white" />
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                      <span className="text-3xl drop-shadow-lg">{getIconDisplay(reward.freeReward.icon)}</span>
                      <span className={`text-[10px] mt-1 text-center line-clamp-2 font-medium ${rarityStyles[freeRarity].text}`}>
                        {reward.freeReward.name}
                      </span>
                    </div>

                    {/* Available Glow */}
                    {freeAvailable && !freeClaimed && (
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent animate-pulse" />
                    )}
                  </motion.button>
                </div>

                {/* Current Day Marker */}
                {isCurrentDay && (
                  <div className="mt-2 flex justify-center">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary">
                      <Star className="h-3 w-3 fill-primary" />
                      <span className="text-[10px] font-bold uppercase">Today</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Quick Jump Pills */}
        <div className="flex justify-center gap-2 mt-4 px-6 flex-wrap">
          {[1, 7, 14, 21, 30].map((milestone) => (
            <Button
              key={milestone}
              variant="ghost"
              size="sm"
              onClick={() => {
                if (scrollRef.current) {
                  const cardWidth = 140;
                  scrollRef.current.scrollTo({ left: (milestone - 2) * cardWidth, behavior: "smooth" });
                }
              }}
              className={`
                text-xs font-medium rounded-full px-4
                ${currentDay === milestone ? "bg-primary/20 text-primary border border-primary/40" : "hover:bg-muted/50"}
              `}
            >
              {milestone === 30 ? (
                <><Trophy className="h-3 w-3 mr-1 text-amber-400" /> Final</>
              ) : (
                `Day ${milestone}`
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Zen Skip Dialog */}
      <AlertDialog open={zenSkipConfirm !== null} onOpenChange={(open) => !open && setZenSkipConfirm(null)}>
        <AlertDialogContent className="border-primary/30 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Unlock className="h-5 w-5 text-amber-400" />
              </div>
              Unlock Reward Early
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Skip ahead and unlock <span className="font-bold text-foreground">{zenSkipConfirm?.rewardName}</span> for Day {zenSkipConfirm?.day}.
                </p>
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cost</span>
                    <span className="text-xl font-bold text-amber-400">{zenSkipConfirm?.zenCost.toLocaleString()} Zen</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm px-2">
                  <span className="text-muted-foreground">Your Balance</span>
                  <span className={userZen >= (zenSkipConfirm?.zenCost || 0) ? "text-emerald-400 font-bold" : "text-destructive font-bold"}>
                    {userZen.toLocaleString()} Zen
                  </span>
                </div>
                {userZen < (zenSkipConfirm?.zenCost || 0) && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    You need {((zenSkipConfirm?.zenCost || 0) - userZen).toLocaleString()} more Zen.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmZenSkip}
              disabled={userZen < (zenSkipConfirm?.zenCost || 0) || loading}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/25"
            >
              {loading ? "Processing..." : "Unlock Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
