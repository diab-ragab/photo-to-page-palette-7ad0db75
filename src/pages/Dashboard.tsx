import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useVoteSystem } from "@/hooks/useVoteSystem";
import { Leaderboards } from "@/components/Leaderboards";
import { GamePass } from "@/components/GamePass";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Coins, 
  Crown, 
  Vote, 
  Clock, 
  Shield, 
  Award,
  TrendingUp,
  Gift,
  Timer,
  ArrowRightLeft
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, isGM, logout } = useAuth();
  const { voteData, loading, timeRemaining, submitVote } = useVoteSystem();
  const [serverStats, setServerStats] = useState({
    players: 0,
    accounts: 0,
    uptime: ""
  });

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  // Fetch server stats
  useEffect(() => {
    const fetchServerStats = async () => {
      try {
        const response = await fetch("https://woiendgame.online/api/server-status.php");
        const data = await response.json();
        setServerStats({
          players: data.players || 0,
          accounts: data.accounts || 0,
          uptime: data.uptime || ""
        });
      } catch {
        // Silent fail - don't expose errors in production
      }
    };

    fetchServerStats();
    const interval = setInterval(fetchServerStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate VIP progress (example: 1000 points = VIP 1, 5000 = VIP 2, etc.)
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Dashboard - WOI Endgame"
        description="Manage your WOI Endgame account, vote for rewards, and track your progress."
      />
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24 md:pt-28">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display text-primary mb-2">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-muted-foreground">
              Manage your account and collect your daily rewards
            </p>
          </div>
          
          {/* GM Panel Switch */}
          {isGM && (
            <Button
              onClick={() => navigate("/gm-panel")}
              variant="outline"
              className="group gap-2 border-primary/30 hover:border-primary hover:bg-primary/10"
            >
              <Shield className="h-4 w-4 text-primary" />
              <span>GM Panel</span>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Coins Card */}
          <div className="group relative p-[1px] rounded-xl bg-gradient-to-br from-yellow-500/50 via-transparent to-yellow-500/50 hover:from-yellow-500 hover:to-amber-500 transition-all duration-500">
            <Card className="relative bg-card rounded-xl overflow-hidden transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-lg group-hover:shadow-yellow-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vote Coins
                </CardTitle>
                <div className="p-2 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors duration-300">
                  <Coins className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-foreground">{voteData.coins.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Spend in the shop</p>
              </CardContent>
            </Card>
          </div>

          {/* VIP Points Card */}
          <div className="group relative p-[1px] rounded-xl bg-gradient-to-br from-purple-500/50 via-transparent to-purple-500/50 hover:from-purple-500 hover:to-pink-500 transition-all duration-500">
            <Card className="relative bg-card rounded-xl overflow-hidden transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-lg group-hover:shadow-purple-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  VIP Points
                </CardTitle>
                <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors duration-300">
                  <Crown className={`h-5 w-5 ${vipInfo.color} group-hover:scale-110 transition-transform duration-300`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-foreground">{voteData.vipPoints.toLocaleString()}</div>
                <p className={`text-xs mt-1 ${vipInfo.color}`}>{vipInfo.name}</p>
              </CardContent>
            </Card>
          </div>

          {/* Total Votes Card */}
          <div className="group relative p-[1px] rounded-xl bg-gradient-to-br from-green-500/50 via-transparent to-green-500/50 hover:from-green-500 hover:to-emerald-500 transition-all duration-500">
            <Card className="relative bg-card rounded-xl overflow-hidden transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-lg group-hover:shadow-green-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Votes
                </CardTitle>
                <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors duration-300">
                  <Vote className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-foreground">{voteData.totalVotes}</div>
                <p className="text-xs text-muted-foreground mt-1">All-time votes</p>
              </CardContent>
            </Card>
          </div>

          {/* Server Status Card */}
          <div className="group relative p-[1px] rounded-xl bg-gradient-to-br from-primary/50 via-transparent to-primary/50 hover:from-primary hover:to-blue-500 transition-all duration-500">
            <Card className="relative bg-card rounded-xl overflow-hidden transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-lg group-hover:shadow-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Online Players
                </CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                  <TrendingUp className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-foreground">{serverStats.players}</div>
                <p className="text-xs text-muted-foreground mt-1">Uptime: {serverStats.uptime}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vote Section */}
          <Card className="lg:col-span-2 bg-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Gift className="h-5 w-5 text-primary" />
                Vote Rewards
              </CardTitle>
              <CardDescription>
                Vote every 12 hours to earn coins and VIP points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Vote Button Area */}
              <div className="flex flex-col md:flex-row items-center gap-4 p-6 bg-background/50 rounded-lg border border-border">
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-semibold mb-1">Daily Vote</h3>
                  <p className="text-sm text-muted-foreground">
                    Earn <span className="text-yellow-500 font-medium">50 Coins</span> and{" "}
                    <span className="text-purple-400 font-medium">25 VIP Points</span>
                  </p>
                </div>
                
                {voteData.canVote ? (
                  <Button 
                    size="lg" 
                    onClick={submitVote}
                    disabled={loading}
                    className="w-full md:w-auto min-w-[160px] bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  >
                    {loading ? (
                      <>
                        <Timer className="mr-2 h-4 w-4 animate-spin" />
                        Voting...
                      </>
                    ) : (
                      <>
                        <Vote className="mr-2 h-4 w-4" />
                        Vote Now
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Next vote in:</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-primary">
                      {timeRemaining || "Loading..."}
                    </div>
                  </div>
                )}
              </div>

              {/* Rewards Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-background/30 rounded-lg border border-border/50 text-center">
                  <Coins className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="font-semibold">50 Coins</div>
                  <div className="text-xs text-muted-foreground">Per vote</div>
                </div>
                <div className="p-4 bg-background/30 rounded-lg border border-border/50 text-center">
                  <Crown className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <div className="font-semibold">25 VIP Points</div>
                  <div className="text-xs text-muted-foreground">Per vote</div>
                </div>
                <div className="p-4 bg-background/30 rounded-lg border border-border/50 text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="font-semibold">12 Hour Cooldown</div>
                  <div className="text-xs text-muted-foreground">Anti-abuse protection</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile & VIP Progress */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{user?.username}</div>
                    <div className="text-sm text-muted-foreground">{user?.email}</div>
                    <div className={`text-sm font-medium ${vipInfo.color}`}>{vipInfo.name}</div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* VIP Progress Card */}
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-purple-400" />
                  VIP Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={vipInfo.color}>{vipInfo.name}</span>
                    {vipInfo.level < 3 && (
                      <span className="text-muted-foreground">
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

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">VIP Benefits:</div>
                  <div className="space-y-1 text-xs">
                    <div className={vipInfo.level >= 1 ? "text-foreground" : "text-muted-foreground/50"}>
                      • VIP I: +10% shop discount
                    </div>
                    <div className={vipInfo.level >= 2 ? "text-foreground" : "text-muted-foreground/50"}>
                      • VIP II: +20% shop discount
                    </div>
                    <div className={vipInfo.level >= 3 ? "text-foreground" : "text-muted-foreground/50"}>
                      • VIP III: +30% shop discount + exclusive items
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Game Pass Section */}
        <div className="mt-8">
          <GamePass />
        </div>

        {/* Leaderboards Section */}
        <div className="mt-8">
          <Leaderboards />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
