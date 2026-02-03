import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CharacterSelector } from "@/components/shop/CharacterSelector";
import {
  Crown,
  Lock,
  Gift,
  Coins,
  Star,
  Sparkles,
  ShoppingBag,
  Check,
  ChevronLeft,
  ChevronRight,
  Gem,
  Sword,
  Shield,
  Zap,
  Clock,
  Calendar,
  History,
  User,
} from "lucide-react";

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

interface ApiReward {
  id: number;
  day: number;
  tier: "free" | "elite";
  item_id: number;
  item_name: string;
  quantity: number;
  coins: number;
  zen: number;
  exp: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string;
}

interface PassReward {
  day: number;
  freeReward: {
    type: "coins" | "vip_points" | "item";
    name: string;
    amount?: number;
    icon: string;
    rarity?: "common" | "rare" | "epic" | "legendary";
  };
  eliteReward: {
    type: "coins" | "vip_points" | "item";
    name: string;
    amount?: number;
    icon: string;
    rarity?: "common" | "rare" | "epic" | "legendary";
  };
}

interface PassStatus {
  status: "not_started" | "active" | "ended";
  currentDay: number;
  totalDays: number;
  startDate: string;
  endDate: string;
}

// Convert API rewards to PassReward format
const convertApiRewards = (apiRewards: ApiReward[]): PassReward[] => {
  const rewards: PassReward[] = [];
  
  // Group by day
  const rewardsByDay: Record<number, { free?: ApiReward; elite?: ApiReward }> = {};
  
  apiRewards.forEach(reward => {
    if (!rewardsByDay[reward.day]) {
      rewardsByDay[reward.day] = {};
    }
    if (reward.tier === "free") {
      rewardsByDay[reward.day].free = reward;
    } else {
      rewardsByDay[reward.day].elite = reward;
    }
  });
  
  // Create PassReward for each day
  for (let day = 1; day <= 30; day++) {
    const dayRewards = rewardsByDay[day];
    
    const defaultFree: PassReward["freeReward"] = { name: "Coming Soon", icon: "🎁", type: "item", rarity: "common" };
    const defaultElite: PassReward["eliteReward"] = { name: "Coming Soon", icon: "👑", type: "item", rarity: "rare" };
    
    let freeReward: PassReward["freeReward"] = defaultFree;
    let eliteReward: PassReward["eliteReward"] = defaultElite;
    
    if (dayRewards?.free) {
      const r = dayRewards.free;
      const rewardType: "coins" | "vip_points" | "item" = r.coins > 0 ? "coins" : r.zen > 0 ? "vip_points" : "item";
      freeReward = {
        name: r.item_name,
        icon: r.icon,
        type: rewardType,
        amount: r.coins > 0 ? r.coins : r.zen > 0 ? r.zen : undefined,
        rarity: r.rarity,
      };
    }
    
    if (dayRewards?.elite) {
      const r = dayRewards.elite;
      const rewardType: "coins" | "vip_points" | "item" = r.coins > 0 ? "coins" : r.zen > 0 ? "vip_points" : "item";
      eliteReward = {
        name: r.item_name,
        icon: r.icon,
        type: rewardType,
        amount: r.coins > 0 ? r.coins : r.zen > 0 ? r.zen : undefined,
        rarity: r.rarity,
      };
    }
    
    rewards.push({ day, freeReward, eliteReward });
  }
  
  return rewards;
};

// Fallback static rewards
const generateFallbackRewards = (): PassReward[] => {
  const rewards: PassReward[] = [];
  const freeItems = [
    { name: "10 Coins", icon: "🪙", type: "coins" as const, amount: 10 },
    { name: "5 VIP Points", icon: "⭐", type: "vip_points" as const, amount: 5 },
    { name: "25 Coins", icon: "🪙", type: "coins" as const, amount: 25 },
    { name: "Health Potion", icon: "🧪", type: "item" as const, rarity: "common" as const },
  ];

  const eliteItems = [
    { name: "100 Coins", icon: "💰", type: "coins" as const, amount: 100 },
    { name: "25 VIP Points", icon: "🌟", type: "vip_points" as const, amount: 25 },
    { name: "Epic Chest", icon: "📦", type: "item" as const, rarity: "epic" as const },
    { name: "Shadow Blade", icon: "🗡️", type: "item" as const, rarity: "legendary" as const },
  ];

  for (let day = 1; day <= 30; day++) {
    rewards.push({
      day,
      freeReward: freeItems[(day - 1) % freeItems.length],
      eliteReward: eliteItems[(day - 1) % eliteItems.length],
    });
  }

  return rewards;
};

const rarityColors = {
  common: "border-muted-foreground/40 bg-gradient-to-br from-muted/30 to-muted/10",
  rare: "border-cyan-500/60 bg-gradient-to-br from-cyan-500/20 to-cyan-900/10",
  epic: "border-purple-500/60 bg-gradient-to-br from-purple-500/20 to-purple-900/10",
  legendary: "border-amber-400/70 bg-gradient-to-br from-amber-500/25 to-orange-900/15",
};

const rarityGlow = {
  common: "",
  rare: "shadow-[0_0_15px_rgba(6,182,212,0.3)]",
  epic: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
  legendary: "shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-[pulse_2s_ease-in-out_infinite]",
};

export const GamePass = () => {
  const { user } = useAuth();
  const [hasElitePass, setHasElitePass] = useState(false);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getSeasonResetTime());
  const [rewards, setRewards] = useState<PassReward[]>(generateFallbackRewards());
  const [passStatus, setPassStatus] = useState<PassStatus | null>(null);
  const [isLoadingRewards, setIsLoadingRewards] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null);

  const handleCharacterSelect = (roleId: number | null, name: string | null) => {
    setSelectedRoleId(roleId);
    setSelectedCharacterName(name);
  };

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getSeasonResetTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch rewards from API
  useEffect(() => {
    const fetchRewards = async () => {
      setIsLoadingRewards(true);
      try {
        const response = await fetch(
          "https://woiendgame.online/api/gamepass_admin.php?action=get_public_rewards"
        );
        const data = await response.json();
        
        if (data.success && data.rewards && data.rewards.length > 0) {
          setRewards(convertApiRewards(data.rewards));
          if (data.pass) {
            setPassStatus(data.pass);
            setCurrentDay(data.pass.currentDay || 1);
          }
        }
      } catch {
        // Silent fail - keep fallback rewards
      } finally {
        setIsLoadingRewards(false);
      }
    };

    fetchRewards();
  }, []);

  // Fetch user pass status from PHP backend
  useEffect(() => {
    const fetchUserPassStatus = async () => {
      if (!user) return;
      
      const sessionToken = localStorage.getItem("woi_session_token") || "";
      
      try {
        const response = await fetch(
          `https://woiendgame.online/api/gamepass.php?action=status`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Accept": "application/json",
              "X-Session-Token": sessionToken,
              "Authorization": `Bearer ${sessionToken}`,
            },
          }
        );
        const data = await response.json();
        
        if (data.success) {
          setHasElitePass(data.is_premium || false);
          // Merge free and elite claimed days into a single array
          const freeClaimed = data.claimed_days?.free || [];
          const eliteClaimed = data.claimed_days?.elite || [];
          setClaimedDays([...new Set([...freeClaimed, ...eliteClaimed])]);
          if (data.current_day) setCurrentDay(data.current_day);
        }
      } catch {
        // Silent fail - no claimed days to show
      }
    };

    fetchUserPassStatus();
  }, [user]);

  const claimReward = async (day: number, isElite: boolean) => {
    if (day > currentDay || claimedDays.includes(day)) return;
    if (isElite && !hasElitePass) return;
    
    // Require character selection
    if (!selectedRoleId) {
      toast.error("Select a character", {
        description: "Please select a character to receive the reward.",
      });
      return;
    }

    const sessionToken = localStorage.getItem("woi_session_token") || "";

    setLoading(true);
    try {
      const response = await fetch("https://woiendgame.online/api/gamepass.php?action=claim", {
        method: "POST",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Session-Token": sessionToken,
          "Authorization": `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          day,
          tier: isElite ? "elite" : "free",
          roleId: selectedRoleId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setClaimedDays([...claimedDays, day]);
        toast.success("Reward claimed!", {
          description: `Sent to ${selectedCharacterName || "your character"}! Check your in-game mailbox.`,
        });
      } else {
        toast.error("Failed to claim reward", {
          description: data.error || "Please try again later.",
        });
      }
    } catch {
      toast.error("Failed to claim reward", {
        description: "Could not connect to server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollLeft = () => {
    setScrollPosition(Math.max(0, scrollPosition - 4));
  };

  const scrollRight = () => {
    setScrollPosition(Math.min(24, scrollPosition + 4));
  };

  const visibleRewards = rewards.slice(scrollPosition, scrollPosition + 6);
  const progressPercent = (currentDay / 30) * 100;

  return (
    <Card className="relative bg-gradient-to-br from-card via-card to-card/80 border-primary/30 overflow-hidden backdrop-blur-sm">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      <CardHeader className="pb-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Game Pass</span>
              {hasElitePass && (
                <Badge className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-bold shadow-[0_0_15px_rgba(251,191,36,0.4)] animate-[pulse_3s_ease-in-out_infinite]">
                  <Crown className="h-3 w-3 mr-1" />
                  Elite
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2 ml-[52px]">
              Claim daily rewards for 30 days. Elite Pass unlocks premium rewards!
            </p>
          </div>

          {!hasElitePass && (
            <Button
              className="relative bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-600 hover:via-yellow-500 hover:to-amber-600 text-black font-bold shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all duration-300 hover:scale-105"
              onClick={() => {
                toast.info("Visit the Shop to purchase Elite Pass", {
                  action: {
                    label: "Go to Shop",
                    onClick: () => window.location.href = "/shop",
                  },
                });
              }}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Elite
              <Sparkles className="h-4 w-4 ml-2 animate-pulse" />
            </Button>
          )}
        </div>

        {/* Season Timer */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-background/50 to-purple-500/10 border border-primary/20 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/20 border border-primary/30">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  Season: <span className="text-primary font-bold">{getSeasonName()}</span>
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-3 hover:bg-primary/10 hover:text-primary transition-colors">
                <Link to="/seasons">
                  <History className="h-3 w-3 mr-1" />
                  Upcoming Seasons
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">Resets in:</span>
              </div>
              <div className="flex gap-1.5">
                {[
                  { value: timeLeft.days, label: "days" },
                  { value: timeLeft.hours.toString().padStart(2, '0'), label: "hrs" },
                  { value: timeLeft.minutes.toString().padStart(2, '0'), label: "min" },
                  { value: timeLeft.seconds.toString().padStart(2, '0'), label: "sec" },
                ].map((item, i) => (
                  <div key={i} className="bg-background/90 border border-primary/20 px-2.5 py-1.5 rounded-lg text-center min-w-[44px] backdrop-blur-sm">
                    <span className="text-sm font-bold bg-gradient-to-b from-primary to-primary/70 bg-clip-text text-transparent">{item.value}</span>
                    <span className="text-[10px] text-muted-foreground block font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              Day <span className="text-foreground font-bold">{currentDay}</span> of 30
            </span>
            <span className="text-primary font-bold">{Math.round(progressPercent)}% Complete</span>
          </div>
          <div className="relative">
            <Progress value={progressPercent} className="h-3 bg-muted/50" />
            <div 
              className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-primary via-cyan-400 to-primary opacity-50 blur-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Character Selector - Only show when logged in */}
        {user && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-primary/20 border border-primary/30">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-bold">Reward Delivery</span>
              {selectedCharacterName && (
                <Badge variant="outline" className="ml-auto border-primary/30 text-primary">
                  {selectedCharacterName}
                </Badge>
              )}
            </div>
            <CharacterSelector 
              onSelect={handleCharacterSelect}
              selectedRoleId={selectedRoleId}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 relative z-10">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollLeft}
            disabled={scrollPosition === 0}
            className="shrink-0 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 mx-4 text-center">
            <span className="text-sm font-medium text-muted-foreground">
              Days <span className="text-foreground font-bold">{scrollPosition + 1}</span> - <span className="text-foreground font-bold">{Math.min(scrollPosition + 6, 30)}</span>
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={scrollRight}
            disabled={scrollPosition >= 24}
            className="shrink-0 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Pass Rows */}
        <div className="space-y-4">
          {/* Elite Pass Row */}
          <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-gradient-to-br from-amber-500/30 to-yellow-500/20 border border-amber-500/40">
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Elite Pass</span>
              {!hasElitePass && (
                <Badge variant="outline" className="ml-2 border-amber-500/30 text-amber-500/70 text-xs">
                  <Lock className="h-2.5 w-2.5 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
            <div className="flex gap-2 overflow-hidden">
              <AnimatePresence mode="popLayout">
                {visibleRewards.map((reward, index) => {
                  const day = reward.day;
                  const isClaimed = claimedDays.includes(day);
                  const isAvailable = day <= currentDay && !isClaimed && hasElitePass;
                  const isLocked = !hasElitePass;
                  const rarity = reward.eliteReward.rarity || "common";

                  return (
                    <motion.div
                      key={`elite-${day}`}
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                      className="flex-1 min-w-[80px]"
                    >
                      <button
                        onClick={() => isAvailable && claimReward(day, true)}
                        disabled={!isAvailable || loading}
                        className={`
                          w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center
                          transition-all duration-300 relative overflow-hidden backdrop-blur-sm
                          ${rarityColors[rarity]} ${rarityGlow[rarity]}
                          ${isAvailable ? "hover:scale-110 cursor-pointer hover:border-amber-400 hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]" : ""}
                          ${isClaimed ? "opacity-60" : ""}
                          ${isLocked ? "grayscale opacity-30" : ""}
                          group
                        `}
                      >
                        {isLocked && (
                          <Lock className="absolute top-1.5 right-1.5 h-3 w-3 text-muted-foreground/50" />
                        )}
                        {isClaimed && (
                          <div className="absolute inset-0 bg-green-500/30 backdrop-blur-sm flex items-center justify-center">
                            <div className="p-1.5 rounded-full bg-green-500/50 border border-green-400">
                              <Check className="h-5 w-5 text-green-300" />
                            </div>
                          </div>
                        )}
                        {isAvailable && !isClaimed && (
                          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        <span className="text-2xl mb-1 drop-shadow-lg group-hover:scale-110 transition-transform">{reward.eliteReward.icon}</span>
                        <span className="text-[10px] text-muted-foreground text-center px-1 line-clamp-1 font-medium">
                          {reward.eliteReward.name}
                        </span>
                      </button>
                      <div className="text-center text-xs text-muted-foreground mt-1.5 font-medium">
                        Day {day}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Free Pass Row */}
          <div className="relative p-4 rounded-xl bg-gradient-to-r from-primary/10 via-cyan-500/5 to-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-gradient-to-br from-primary/30 to-cyan-500/20 border border-primary/40">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-primary">Free Pass</span>
            </div>
            <div className="flex gap-2 overflow-hidden">
              <AnimatePresence mode="popLayout">
                {visibleRewards.map((reward, index) => {
                  const day = reward.day;
                  const isClaimed = claimedDays.includes(day);
                  const isAvailable = day <= currentDay && !isClaimed;
                  const rarity = reward.freeReward.rarity || "common";

                  return (
                    <motion.div
                      key={`free-${day}`}
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                      className="flex-1 min-w-[80px]"
                    >
                      <button
                        onClick={() => isAvailable && claimReward(day, false)}
                        disabled={!isAvailable || loading}
                        className={`
                          w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center
                          transition-all duration-300 relative overflow-hidden backdrop-blur-sm
                          ${rarityColors[rarity]} ${rarityGlow[rarity]}
                          ${isAvailable ? "hover:scale-110 cursor-pointer hover:border-primary hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]" : ""}
                          ${isClaimed ? "opacity-60" : ""}
                          ${day > currentDay ? "opacity-30" : ""}
                          group
                        `}
                      >
                        {day > currentDay && (
                          <Lock className="absolute top-1.5 right-1.5 h-3 w-3 text-muted-foreground/50" />
                        )}
                        {isClaimed && (
                          <div className="absolute inset-0 bg-green-500/30 backdrop-blur-sm flex items-center justify-center">
                            <div className="p-1.5 rounded-full bg-green-500/50 border border-green-400">
                              <Check className="h-5 w-5 text-green-300" />
                            </div>
                          </div>
                        )}
                        {isAvailable && !isClaimed && (
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        <span className="text-2xl mb-1 drop-shadow-lg group-hover:scale-110 transition-transform">{reward.freeReward.icon}</span>
                        <span className="text-[10px] text-muted-foreground text-center px-1 line-clamp-1 font-medium">
                          {reward.freeReward.name}
                        </span>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Quick Jump */}
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          {[1, 7, 14, 21, 30].map((milestone) => {
            const isActive = scrollPosition <= milestone - 1 && scrollPosition + 6 > milestone;
            return (
              <Button
                key={milestone}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setScrollPosition(Math.max(0, milestone - 3))}
                className={`
                  text-xs font-medium transition-all duration-300
                  ${isActive 
                    ? "bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
                    : "border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                  }
                `}
              >
                {milestone === 30 ? (
                  <><Star className="h-3 w-3 mr-1" /> Final</>
                ) : (
                  `Day ${milestone}`
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
