import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useVoteSystem } from "@/hooks/useVoteSystem";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { fetchJsonOrThrow, API_BASE, apiGet, getAuthHeaders } from "@/lib/apiFetch";
import { Leaderboards } from "@/components/Leaderboards";
import { GamePass } from "@/components/GamePass";
import { VoteSiteCard } from "@/components/VoteSiteCard";
import { VoteStreakCard } from "@/components/VoteStreakCard";
import { OrderHistory } from "@/components/OrderHistory";
import { DailyZenReward } from "@/components/DailyZenReward";
import { AchievementsCard } from "@/components/AchievementsCard";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { LuckyWheel } from "@/components/LuckyWheel";
import { UpcomingEvents, EventsCalendar } from "@/components/EventsCalendar";
import { NotificationSettings } from "@/components/NotificationSettings";
import { DailyLottery } from "@/components/DailyLottery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserWallet } from "@/components/UserWallet";
import { VoteRewardsCard } from "@/components/VoteRewardsCard";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";
import { motion } from "framer-motion";
import { 
  User, 
  Coins, 
  Crown, 
  Vote, 
  ShieldAlert, 
  Award,
  Gift,
  ArrowRightLeft,
  CheckCircle2,
  Flame,
  Sparkles,
  Trophy,
  BarChart3,
  ShoppingBag,
  LogOut,
  ChevronRight,
  Calendar,
  Bell,
  Ticket,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { voteData, voteSites, loading, sitesLoading, submitVote, availableVotes, totalSites, streakData } = useVoteSystem();
  const [userZen, setUserZen] = useState(0);
  const [activeTab, setActiveTab] = useState("rewards");
  const [userTier, setUserTier] = useState<"free" | "premium">("free");
  const [gamepassCaptureStatus, setGamepassCaptureStatus] = useState<"idle" | "capturing" | "success" | "error">("idle");
  const [capturedTier, setCapturedTier] = useState("");
  const gamepassCaptureRef = useRef(false);

  // Pull to refresh
  const { containerProps, PullIndicator } = usePullToRefresh({
    onRefresh: async () => {
      // Refetch user currency
      if (user?.username) {
        try {
          const data = await fetchJsonOrThrow<any>(
            `${API_BASE}/user_currency.php?username=${encodeURIComponent(user.username)}`
          );
          if (data.success) setUserZen(data.zen || 0);
        } catch {}
      }
    },
  });
  
  // Initialize notification scheduler
  useNotificationScheduler();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  // Fetch user's Zen from database
  useEffect(() => {
    const fetchUserCurrency = async () => {
      if (!user?.username) return;
      
      try {
        const data = await fetchJsonOrThrow<any>(
          `${API_BASE}/user_currency.php?username=${encodeURIComponent(user.username)}`
        );
        if (data.success) {
          setUserZen(data.zen || 0);
        }
      } catch (err) {
        console.error("[Currency] user_currency.php failed", err);
      }
    };

    fetchUserCurrency();
  }, [user?.username]);

  // Fetch user's game pass tier
  useEffect(() => {
    if (!user) return;
    apiGet<any>(
      `/gamepass.php?action=status&rid=${Date.now()}`,
      true,
      { showErrorToast: false, silentStatuses: [401, 403] }
    ).then(data => {
      if (data?.success) {
        const tier = data.user_tier || (data.is_premium ? "elite" : "free");
        setUserTier(tier as "free" | "elite" | "gold");
      }
    }).catch(() => {});
  }, [user]);

  // Handle ?gamepass_purchased= query param — capture PayPal order
  useEffect(() => {
    const gpTier = searchParams.get("gamepass_purchased");
    const paypalFlag = searchParams.get("paypal");
    const token = searchParams.get("token") || "";
    if (!gpTier || !paypalFlag || gamepassCaptureRef.current) return;
    if (!user) return;
    gamepassCaptureRef.current = true;

    // Clean URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("gamepass_purchased");
    newParams.delete("paypal");
    newParams.delete("token");
    setSearchParams(newParams, { replace: true });

    // We need to find the PayPal order ID from the pending purchase
    setGamepassCaptureStatus("capturing");

    const doCapture = async () => {
      try {
        // Find the latest pending purchase for this user/tier
        const sessionToken = localStorage.getItem("woi_session_token") || "";
        // The token from PayPal redirect is the PayPal order ID
        let paypalOrderId = token;
        
        // If no token in URL, try to find from recent purchase
        if (!paypalOrderId) {
          // Fallback: check localStorage for the last purchase
          paypalOrderId = localStorage.getItem("gamepass_paypal_order_id") || "";
        }
        
        if (!paypalOrderId) {
          setGamepassCaptureStatus("error");
          return;
        }

        const res = await fetch(`${API_BASE}/gamepass_capture.php`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ paypal_order_id: paypalOrderId }),
        });

        const data = await res.json();
        if (data.success) {
          setGamepassCaptureStatus("success");
          setCapturedTier(data.tier || gpTier);
          setUserTier((data.tier || gpTier) as "free" | "elite" | "gold");
          localStorage.removeItem("gamepass_paypal_order_id");
        } else {
          console.error("[GamePass Capture]", data.message);
          setGamepassCaptureStatus("error");
        }
      } catch (err) {
        console.error("[GamePass Capture] Error:", err);
        setGamepassCaptureStatus("error");
      }
    };

    doCapture();
  }, [user, searchParams, setSearchParams]);

  // Handle ?gamepass_extended= query param — capture extend PayPal order
  useEffect(() => {
    const gpDays = searchParams.get("gamepass_extended");
    const paypalFlag = searchParams.get("paypal");
    const token = searchParams.get("token") || "";
    if (!gpDays || !paypalFlag || gamepassCaptureRef.current) return;
    if (!user) return;
    gamepassCaptureRef.current = true;

    const newParams = new URLSearchParams(searchParams);
    newParams.delete("gamepass_extended");
    newParams.delete("paypal");
    newParams.delete("token");
    setSearchParams(newParams, { replace: true });

    setGamepassCaptureStatus("capturing");

    const doCapture = async () => {
      try {
        let paypalOrderId = token;
        if (!paypalOrderId) {
          paypalOrderId = localStorage.getItem("gamepass_extend_paypal_order_id") || "";
        }
        if (!paypalOrderId) {
          setGamepassCaptureStatus("error");
          return;
        }

        const res = await fetch(`${API_BASE}/gamepass_extend_capture.php`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ paypal_order_id: paypalOrderId }),
        });

        const data = await res.json();
        if (data.success) {
          setGamepassCaptureStatus("success");
          setCapturedTier(`${data.tier || ""} +${data.days_added || gpDays} days`);
          localStorage.removeItem("gamepass_extend_paypal_order_id");
        } else {
          console.error("[GamePass Extend Capture]", data.message);
          setGamepassCaptureStatus("error");
        }
      } catch (err) {
        console.error("[GamePass Extend Capture] Error:", err);
        setGamepassCaptureStatus("error");
      }
    };

    doCapture();
  }, [user, searchParams, setSearchParams]);

  // Calculate VIP progress
  const getVipLevel = (points: number) => {
    if (points >= 10000) return { level: 3, name: "VIP III", color: "text-yellow-400" };
    if (points >= 5000) return { level: 2, name: "VIP II", color: "text-purple-400" };
    if (points >= 1000) return { level: 1, name: "VIP I", color: "text-blue-400" };
    return { level: 0, name: "Standard", color: "text-muted-foreground" };
  };

  const getNextVipThreshold = (points: number) => {
    if (points >= 10000) return { next: 10000, current: 10000 };
    if (points >= 5000) return { next: 10000, current: 5000 };
    if (points >= 1000) return { next: 5000, current: 1000 };
    return { next: 1000, current: 0 };
  };

  const vipInfo = getVipLevel(voteData.vipPoints);
  const vipProgress = getNextVipThreshold(voteData.vipPoints);
  const progressPercent = ((voteData.vipPoints - vipProgress.current) / (vipProgress.next - vipProgress.current)) * 100;

  if (!isLoggedIn) return null;

  // Compact stat card component for mobile
  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subLabel, 
    gradient 
  }: { 
    icon: any; 
    label: string; 
    value: string | number; 
    subLabel?: string;
    gradient: string;
  }) => (
    <div className={`relative p-3 rounded-xl bg-gradient-to-br ${gradient} border border-white/10`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-background/80 backdrop-blur-sm">
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] md:text-xs text-white/70 truncate">{label}</p>
          <p className="text-base md:text-lg font-bold text-white truncate">{value}</p>
          {subLabel && <p className="text-[10px] text-white/60 truncate">{subLabel}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground" {...containerProps}>
      <SEO 
        title="Dashboard - WOI Endgame"
        description="Manage your WOI Endgame account, vote for rewards, and track your progress."
      />
      <Navbar />
      
      <main className="container mx-auto px-3 md:px-4 py-4 pt-20 md:pt-24 pb-24 md:pb-8">
        <PullIndicator />

        {/* Game Pass capture status banner */}
        {gamepassCaptureStatus === "capturing" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3"
          >
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Activating your Game Pass...</span>
          </motion.div>
        )}
        {gamepassCaptureStatus === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-500">
                🎉 {capturedTier.charAt(0).toUpperCase() + capturedTier.slice(1)} Game Pass Activated!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your premium rewards are now available. Check the Progress tab!
              </p>
            </div>
          </motion.div>
        )}
        {gamepassCaptureStatus === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3"
          >
            <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Payment capture issue</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your payment was received but activation failed. Please contact support.
              </p>
            </div>
          </motion.div>
        )}

        {/* Compact Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 mb-4 md:mb-6"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-lg md:text-xl font-bold text-primary-foreground">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-2xl font-display text-foreground truncate">
                  {user?.username}
                </h1>
                {userTier === "gold" && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] md:text-xs px-2 py-0.5 font-display shadow-md shadow-amber-500/20 animate-pulse">
                    <Crown className="h-3 w-3 mr-1" />
                    GOLD
                  </Badge>
                )}
                {userTier === "elite" && (
                  <Badge className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white border-0 text-[10px] md:text-xs px-2 py-0.5 font-display shadow-md shadow-purple-500/20">
                    <Sparkles className="h-3 w-3 mr-1" />
                    ELITE
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={`text-[10px] md:text-xs px-1.5 py-0 border-current ${vipInfo.color}`}>
                  {vipInfo.name}
                </Badge>
                {vipInfo.level > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    Lv.{vipInfo.level}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                onClick={() => navigate("/admin")}
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/30 hover:border-destructive hover:bg-destructive/10 hidden sm:flex"
              >
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <span className="hidden md:inline">Admin</span>
              </Button>
            )}
            <Button
              onClick={() => { logout(); navigate("/"); }}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats - Horizontal scroll on mobile */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6"
        >
          <StatCard 
            icon={Coins}
            label="Vote Coins"
            value={voteData.coins.toLocaleString()}
            gradient="from-yellow-500/20 to-amber-600/20"
          />
          <StatCard 
            icon={Crown}
            label="VIP Points"
            value={voteData.vipPoints.toLocaleString()}
            subLabel={vipInfo.name}
            gradient="from-purple-500/20 to-pink-600/20"
          />
          <StatCard 
            icon={Vote}
            label="Total Votes"
            value={voteData.totalVotes}
            gradient="from-green-500/20 to-emerald-600/20"
          />
          <StatCard 
            icon={Flame}
            label="Streak"
            value={`${streakData.current} 🔥`}
            subLabel={`${streakData.multiplier}x bonus`}
            gradient="from-orange-500/20 to-red-600/20"
          />
        </motion.div>

        {/* Mobile Admin Button */}
        {isAdmin && (
          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            className="w-full mb-4 gap-2 border-destructive/30 hover:border-destructive hover:bg-destructive/10 sm:hidden"
          >
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span>Admin Dashboard</span>
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        )}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex items-center gap-1 h-auto p-1.5 mb-4 md:mb-6 bg-card/80 border border-border/50 rounded-2xl sticky top-16 md:top-20 z-40 backdrop-blur-xl shadow-lg shadow-black/5">
            {[
              { value: "rewards", icon: Gift, label: "Rewards" },
              { value: "lottery", icon: Ticket, label: "Lottery" },
              { value: "spin", icon: Sparkles, label: "Spin" },
              { value: "events", icon: Calendar, label: "Events" },
              { value: "progress", icon: Trophy, label: "Progress" },
              { value: "stats", icon: BarChart3, label: "Stats" },
              { value: "alerts", icon: Bell, label: "Alerts" },
              { value: "shop", icon: ShoppingBag, label: "Shop" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="relative flex-1 flex-col gap-0.5 py-2.5 text-[10px] md:text-xs rounded-xl transition-all duration-300 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 data-[state=active]:border-primary/20 data-[state=active]:border text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline font-medium">{label}</span>
                {activeTab === value && (
                  <motion.div
                    layoutId="tab-glow"
                    className="absolute inset-0 rounded-xl bg-primary/5 -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-0 space-y-4 md:space-y-6">
            {/* Daily Rewards Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DailyZenReward onClaim={(amount) => setUserZen((prev) => prev + amount)} />
              <VoteStreakCard streakData={streakData} />
            </div>

            {/* Vote Section */}
            <Card className="bg-card border-primary/20">
              <CardHeader className="pb-3 md:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                      <Gift className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Vote Rewards</span>
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm mt-1">
                      Vote to earn coins and VIP points
                    </CardDescription>
                  </div>
                  {totalSites > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-full flex-shrink-0">
                      {availableVotes === 0 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Vote className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span className="text-xs font-medium">
                        {totalSites - availableVotes}/{totalSites}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {sitesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-[120px] rounded-xl" />
                    ))}
                  </div>
                ) : voteSites.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No vote sites configured yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {voteSites.map((site) => (
                      <VoteSiteCard
                        key={site.id}
                        site={site}
                        onVote={submitVote}
                        loading={loading}
                      />
                    ))}
                  </div>
                )}

                {!sitesLoading && availableVotes === 0 && totalSites > 0 && (
                  <div className="flex items-center justify-center gap-2 p-3 mt-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-500 font-medium text-sm">
                      All sites voted! Check back later.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vote Rewards Summary */}
            <VoteRewardsCard sites={voteSites} loading={sitesLoading} />
          </TabsContent>

          {/* Lottery Tab */}
          <TabsContent value="lottery" className="mt-0 space-y-4 md:space-y-6">
            <DailyLottery />
          </TabsContent>

          {/* Spin Tab */}
          <TabsContent value="spin" className="mt-0 space-y-4 md:space-y-6">
            <UserWallet 
              coins={voteData.coins} 
              vipPoints={voteData.vipPoints}
              zen={userZen}
            />
            <LuckyWheel />
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-0 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <EventsCalendar />
              <UpcomingEvents />
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="mt-0 space-y-4 md:space-y-6">
            {/* VIP Progress Card */}
            <Card className="bg-card border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Award className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                  VIP Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={vipInfo.color}>{vipInfo.name}</span>
                    {vipInfo.level < 3 && (
                      <span className="text-muted-foreground text-xs">
                        {voteData.vipPoints.toLocaleString()} / {vipProgress.next.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Progress value={vipInfo.level >= 3 ? 100 : progressPercent} className="h-2" />
                  {vipInfo.level < 3 && (
                    <p className="text-xs text-muted-foreground">
                      {(vipProgress.next - voteData.vipPoints).toLocaleString()} points to next level
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border">
                  {[
                    { level: 1, name: "VIP I", benefit: "+10% shop discount" },
                    { level: 2, name: "VIP II", benefit: "+20% shop discount" },
                    { level: 3, name: "VIP III", benefit: "+30% + exclusive items" },
                  ].map((tier) => (
                    <div 
                      key={tier.level}
                      className={`p-2.5 rounded-lg text-center text-xs ${
                        vipInfo.level >= tier.level 
                          ? "bg-primary/10 border border-primary/30" 
                          : "bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div className="font-medium">{tier.name}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">{tier.benefit}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <AchievementsCard />

            {/* Game Pass */}
            <GamePass />
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="mt-0 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <PlayerStatsCard />
              
              {/* Profile Card */}
              <Card className="bg-card border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                      <span className="text-xl md:text-2xl font-bold text-primary-foreground">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-base md:text-lg truncate">{user?.username}</div>
                      <div className="text-xs md:text-sm text-muted-foreground truncate">{user?.email}</div>
                      <div className={`text-xs md:text-sm font-medium ${vipInfo.color}`}>{vipInfo.name}</div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate("/shop")}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Visit Shop
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboards */}
            <Leaderboards />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-0 space-y-4 md:space-y-6">
            <NotificationSettings />
          </TabsContent>

          {/* Shop Tab */}
          <TabsContent value="shop" className="mt-0 space-y-4 md:space-y-6">
            <UserWallet 
              coins={voteData.coins} 
              vipPoints={voteData.vipPoints}
              zen={userZen}
            />
            
            <OrderHistory />

            <Card className="bg-gradient-to-br from-primary/10 to-purple-600/10 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="p-4 rounded-full bg-primary/20">
                  <ShoppingBag className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">Ready to Shop?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use your coins to purchase exclusive items
                  </p>
                </div>
                <Button onClick={() => navigate("/shop")} className="gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Go to Shop
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
