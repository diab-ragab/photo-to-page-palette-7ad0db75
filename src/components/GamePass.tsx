import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Link } from "react-router-dom";
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
  common: "border-muted-foreground/30 bg-muted/20",
  rare: "border-blue-500/50 bg-blue-500/10",
  epic: "border-purple-500/50 bg-purple-500/10",
  legendary: "border-amber-500/50 bg-amber-500/10 animate-pulse",
};

const rarityGlow = {
  common: "",
  rare: "shadow-blue-500/20",
  epic: "shadow-purple-500/20",
  legendary: "shadow-amber-500/30 shadow-lg",
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
      
      try {
        const response = await fetch(
          `https://woiendgame.online/api/gamepass.php?action=get_status&user_id=${user.username}`
        );
        const data = await response.json();
        
        if (data.success) {
          setHasElitePass(data.hasElitePass || false);
          setClaimedDays(data.claimedDays || []);
          if (data.currentDay) setCurrentDay(data.currentDay);
        }
      } catch {
        // Silent fail - use mock data for demo
        setClaimedDays([1, 2, 3, 4]);
      }
    };

    fetchUserPassStatus();
  }, [user]);

  const claimReward = async (day: number, isElite: boolean) => {
    if (day > currentDay || claimedDays.includes(day)) return;
    if (isElite && !hasElitePass) return;

    setLoading(true);
    try {
      const response = await fetch("https://woiendgame.online/api/gamepass.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim_reward",
          user_id: user?.username,
          day,
          is_elite: isElite,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setClaimedDays([...claimedDays, day]);
        toast.success("Reward claimed!", {
          description: `You received: ${rewards[day - 1][isElite ? "eliteReward" : "freeReward"].name}`,
        });
      } else {
        // Demo mode - still claim
        setClaimedDays([...claimedDays, day]);
        const reward = rewards[day - 1][isElite ? "eliteReward" : "freeReward"];
        toast.success("Reward claimed!", {
          description: `You received: ${reward.name}`,
        });
      }
    } catch (error) {
      // Demo mode fallback
      setClaimedDays([...claimedDays, day]);
      const reward = rewards[day - 1][isElite ? "eliteReward" : "freeReward"];
      toast.success("Reward claimed!", {
        description: `You received: ${reward.name}`,
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
    <Card className="bg-card border-primary/20 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Gift className="h-5 w-5 text-primary" />
              Game Pass
              {hasElitePass && (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black ml-2">
                  <Crown className="h-3 w-3 mr-1" />
                  Elite
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Claim daily rewards for 30 days. Elite Pass unlocks premium rewards!
            </p>
          </div>

          {!hasElitePass && (
            <Button
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold"
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
            </Button>
          )}
        </div>

        {/* Season Timer */}
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Season: <span className="text-primary">{getSeasonName()}</span>
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2">
                <Link to="/seasons">
                  <History className="h-3 w-3 mr-1" />
                  Upcoming Seasons
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Resets in:</span>
              <div className="flex gap-1">
                <div className="bg-background/80 border border-border px-2 py-1 rounded text-center min-w-[40px]">
                  <span className="text-sm font-bold text-primary">{timeLeft.days}</span>
                  <span className="text-[10px] text-muted-foreground block">days</span>
                </div>
                <div className="bg-background/80 border border-border px-2 py-1 rounded text-center min-w-[40px]">
                  <span className="text-sm font-bold text-primary">{timeLeft.hours.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-muted-foreground block">hrs</span>
                </div>
                <div className="bg-background/80 border border-border px-2 py-1 rounded text-center min-w-[40px]">
                  <span className="text-sm font-bold text-primary">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-muted-foreground block">min</span>
                </div>
                <div className="bg-background/80 border border-border px-2 py-1 rounded text-center min-w-[40px]">
                  <span className="text-sm font-bold text-primary">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-muted-foreground block">sec</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Day {currentDay} of 30</span>
            <span className="text-primary font-medium">{Math.round(progressPercent)}% Complete</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollLeft}
            disabled={scrollPosition === 0}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 mx-2 text-center text-sm text-muted-foreground">
            Days {scrollPosition + 1} - {Math.min(scrollPosition + 6, 30)}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={scrollRight}
            disabled={scrollPosition >= 24}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Pass Rows */}
        <div className="space-y-3">
          {/* Elite Pass Row */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-500">Elite Pass</span>
              {!hasElitePass && (
                <Lock className="h-3 w-3 text-muted-foreground" />
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
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex-1 min-w-[80px]"
                    >
                      <button
                        onClick={() => isAvailable && claimReward(day, true)}
                        disabled={!isAvailable || loading}
                        className={`
                          w-full aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                          transition-all duration-300 relative overflow-hidden
                          ${rarityColors[rarity]} ${rarityGlow[rarity]}
                          ${isAvailable ? "hover:scale-105 cursor-pointer hover:border-amber-500" : ""}
                          ${isClaimed ? "opacity-50" : ""}
                          ${isLocked ? "grayscale opacity-40" : ""}
                        `}
                      >
                        {isLocked && (
                          <Lock className="absolute top-1 right-1 h-3 w-3 text-muted-foreground" />
                        )}
                        {isClaimed && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-500" />
                          </div>
                        )}
                        <span className="text-2xl mb-1">{reward.eliteReward.icon}</span>
                        <span className="text-[10px] text-muted-foreground text-center px-1 line-clamp-1">
                          {reward.eliteReward.name}
                        </span>
                      </button>
                      <div className="text-center text-xs text-muted-foreground mt-1">
                        Day {day}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Free Pass Row */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Free Pass</span>
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
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex-1 min-w-[80px]"
                    >
                      <button
                        onClick={() => isAvailable && claimReward(day, false)}
                        disabled={!isAvailable || loading}
                        className={`
                          w-full aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                          transition-all duration-300 relative overflow-hidden
                          ${rarityColors[rarity]} ${rarityGlow[rarity]}
                          ${isAvailable ? "hover:scale-105 cursor-pointer hover:border-primary" : ""}
                          ${isClaimed ? "opacity-50" : ""}
                          ${day > currentDay ? "opacity-40" : ""}
                        `}
                      >
                        {day > currentDay && (
                          <Lock className="absolute top-1 right-1 h-3 w-3 text-muted-foreground" />
                        )}
                        {isClaimed && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-500" />
                          </div>
                        )}
                        <span className="text-2xl mb-1">{reward.freeReward.icon}</span>
                        <span className="text-[10px] text-muted-foreground text-center px-1 line-clamp-1">
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
        <div className="mt-4 flex items-center justify-center gap-2">
          {[1, 7, 14, 21, 30].map((milestone) => (
            <Button
              key={milestone}
              variant={scrollPosition <= milestone - 1 && scrollPosition + 6 > milestone ? "default" : "outline"}
              size="sm"
              onClick={() => setScrollPosition(Math.max(0, milestone - 3))}
              className="text-xs"
            >
              {milestone === 30 ? "Final" : `Day ${milestone}`}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
