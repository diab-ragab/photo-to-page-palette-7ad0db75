import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useVoteSystem } from "@/hooks/useVoteSystem";
import { fetchJsonOrThrow } from "@/lib/apiFetch";
import { Leaderboards } from "@/components/Leaderboards";
import { GamePass } from "@/components/GamePass";
import { VoteSiteCard } from "@/components/VoteSiteCard";
import { VoteStreakCard } from "@/components/VoteStreakCard";
import { OrderHistory } from "@/components/OrderHistory";
import { DailyZenReward } from "@/components/DailyZenReward";
import { AchievementsCard } from "@/components/AchievementsCard";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { LuckyWheel } from "@/components/LuckyWheel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserWallet } from "@/components/UserWallet";
import { VoteRewardsCard } from "@/components/VoteRewardsCard";
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
  ChevronRight
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { voteData, voteSites, loading, sitesLoading, submitVote, availableVotes, totalSites, streakData } = useVoteSystem();
  const [userZen, setUserZen] = useState(0);
  const [activeTab, setActiveTab] = useState("rewards");

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
          `https://woiendgame.online/api/user_currency.php?username=${encodeURIComponent(user.username)}`
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
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Dashboard - WOI Endgame"
        description="Manage your WOI Endgame account, vote for rewards, and track your progress."
      />
      <Navbar />
      
      <main className="container mx-auto px-3 md:px-4 py-4 pt-20 md:pt-24 pb-24 md:pb-8">
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
              <h1 className="text-lg md:text-2xl font-display text-foreground truncate">
                {user?.username}
              </h1>
              <div className={`text-xs md:text-sm font-medium ${vipInfo.color}`}>
                {vipInfo.name}
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
          <TabsList className="w-full grid grid-cols-5 h-auto p-1 mb-4 md:mb-6 bg-muted/50 sticky top-16 md:top-20 z-40 backdrop-blur-md">
            <TabsTrigger value="rewards" className="flex-col gap-0.5 py-2 text-[10px] md:text-xs data-[state=active]:bg-background">
              <Gift className="h-4 w-4" />
              <span className="hidden xs:inline">Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="spin" className="flex-col gap-0.5 py-2 text-[10px] md:text-xs data-[state=active]:bg-background">
              <Sparkles className="h-4 w-4" />
              <span className="hidden xs:inline">Spin</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex-col gap-0.5 py-2 text-[10px] md:text-xs data-[state=active]:bg-background">
              <Trophy className="h-4 w-4" />
              <span className="hidden xs:inline">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-col gap-0.5 py-2 text-[10px] md:text-xs data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden xs:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="shop" className="flex-col gap-0.5 py-2 text-[10px] md:text-xs data-[state=active]:bg-background">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden xs:inline">Shop</span>
            </TabsTrigger>
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

          {/* Spin Tab */}
          <TabsContent value="spin" className="mt-0 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <LuckyWheel />
              <UserWallet 
                coins={voteData.coins} 
                vipPoints={voteData.vipPoints}
                zen={userZen}
              />
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
