import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GamePassRewardsManager } from "@/components/admin/GamePassRewardsManager";
import { VoteSitesManager } from "@/components/admin/VoteSitesManager";
import { NotificationsManager } from "@/components/admin/NotificationsManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { WebshopManager } from "@/components/admin/WebshopManager";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { ServerStatsCard } from "@/components/admin/ServerStatsCard";
import { 
  Shield, 
  Users, 
  Vote, 
  Gift, 
  Bell, 
  ShoppingBag, 
  LayoutDashboard,
  ArrowRightLeft,
  Server,
  Coins,
  Gem,
  UserCheck,
  Swords,
  Receipt
} from "lucide-react";

interface LastOrder {
  id: number;
  user_id: number;
  username: string;
  product_id: number;
  product_name: string;
  quantity: number;
  total_real: number;
  total_coins: number;
  total_zen: number;
  total_vip: number;
  status: string;
  created_at: string;
}

interface ServerStats {
  totalUsers: number;
  totalCharacters: number;
  totalZen: number;
  onlinePlayers: number;
  totalVotes: number;
  totalPurchases: number;
  lastOrder: LastOrder | null;
  recentOrders: LastOrder[];
}

export default function AdminDashboard() {
  const { user, isLoggedIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [serverStats, setServerStats] = useState<ServerStats>({
    totalUsers: 0,
    totalCharacters: 0,
    totalZen: 0,
    onlinePlayers: 0,
    totalVotes: 0,
    totalPurchases: 0,
    lastOrder: null,
    recentOrders: [],
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Check if user has admin role
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isLoggedIn || !user) {
        navigate("/");
        return;
      }

      try {
        const sessionToken = localStorage.getItem("woi_session_token") || "";
        
        // Call PHP API to check admin role from user_roles table
        const response = await fetch(
          "https://woiendgame.online/api/check_admin.php",
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Accept": "application/json",
              ...(sessionToken && { "X-Session-Token": sessionToken }),
            },
          }
        );
        const data = await response.json();
        
        // Check if user has admin role
        if (data.is_admin || data.is_gm || data.roles?.includes("admin")) {
          setIsAuthorized(true);
        } else {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges.",
            variant: "destructive",
          });
          navigate("/dashboard");
        }
      } catch (error) {
        // Fail closed: deny access on any error
        toast({
          title: "Authorization Error",
          description: "Unable to verify admin status. Access denied.",
          variant: "destructive",
        });
        navigate("/dashboard");
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAdminStatus();
  }, [isLoggedIn, user, navigate, toast]);

  // Fetch server stats
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const sessionToken = localStorage.getItem("woi_session_token") || "";
        
        const response = await fetch("https://woiendgame.online/api/admin_stats.php", {
          credentials: "include",
          headers: {
            ...(sessionToken && { "X-Session-Token": sessionToken }),
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setServerStats({
            totalUsers: data.total_users || 0,
            totalCharacters: data.total_characters || 0,
            totalZen: data.total_zen || 0,
            onlinePlayers: data.online_players || 0,
            totalVotes: data.total_votes || 0,
            totalPurchases: data.total_purchases || 0,
            lastOrder: data.last_order || null,
            recentOrders: data.recent_orders || [],
          });
        }
      } catch {
        // Use fallback demo data
        setServerStats({
          totalUsers: 1250,
          totalCharacters: 3420,
          totalZen: 125000000,
          onlinePlayers: 48,
          totalVotes: 8540,
          totalPurchases: 156,
          lastOrder: null,
          recentOrders: [],
        });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [isAuthorized]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking authorization...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin Dashboard | WOI Endgame"
        description="Administrator control panel"
        noIndex
      />
      <Navbar />

      <main className="container px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 rounded-xl bg-destructive/20">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Full control over users, rewards, webshop & server
              </p>
            </div>
          </div>
          
          {/* Switch to User Dashboard */}
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="group gap-2 border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <LayoutDashboard className="h-4 w-4 text-primary" />
            <span>User Dashboard</span>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Button>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <ServerStatsCard
            title="Total Users"
            value={serverStats.totalUsers}
            icon={Users}
            loading={statsLoading}
            color="blue"
          />
          <ServerStatsCard
            title="Characters"
            value={serverStats.totalCharacters}
            icon={Swords}
            loading={statsLoading}
            color="purple"
          />
          <ServerStatsCard
            title="Online Now"
            value={serverStats.onlinePlayers}
            icon={UserCheck}
            loading={statsLoading}
            color="green"
          />
          <ServerStatsCard
            title="Total Zen"
            value={serverStats.totalZen}
            icon={Gem}
            loading={statsLoading}
            color="amber"
            formatNumber
          />
          <ServerStatsCard
            title="Total Votes"
            value={serverStats.totalVotes}
            icon={Vote}
            loading={statsLoading}
            color="cyan"
          />
          <ServerStatsCard
            title="Purchases"
            value={serverStats.totalPurchases}
            icon={ShoppingBag}
            loading={statsLoading}
            color="pink"
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 mb-6 h-auto gap-1">
            <TabsTrigger value="overview" className="gap-2 py-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 py-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="votes" className="gap-2 py-2">
              <Vote className="h-4 w-4" />
              <span className="hidden sm:inline">Votes</span>
            </TabsTrigger>
            <TabsTrigger value="gamepass" className="gap-2 py-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Game Pass</span>
            </TabsTrigger>
            <TabsTrigger value="webshop" className="gap-2 py-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Webshop</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 py-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifs</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab("users")}
                  >
                    <Users className="h-6 w-6 text-blue-500" />
                    <span className="text-sm">Manage Users</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab("votes")}
                  >
                    <Vote className="h-6 w-6 text-green-500" />
                    <span className="text-sm">Vote Sites</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab("gamepass")}
                  >
                    <Gift className="h-6 w-6 text-purple-500" />
                    <span className="text-sm">Game Pass</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab("webshop")}
                  >
                    <ShoppingBag className="h-6 w-6 text-amber-500" />
                    <span className="text-sm">Webshop</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Server Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Server Status
                  </CardTitle>
                  <CardDescription>Current server information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="default" className="bg-green-500">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Players Online</span>
                    <span className="font-medium">{serverStats.onlinePlayers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Accounts</span>
                    <span className="font-medium">{serverStats.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Characters</span>
                    <span className="font-medium">{serverStats.totalCharacters.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Server Zen</span>
                    <span className="font-medium text-amber-500">
                      {serverStats.totalZen >= 1000000 
                        ? `${(serverStats.totalZen / 1000000).toFixed(1)}M` 
                        : serverStats.totalZen.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-pink-500" />
                    Recent Orders
                  </CardTitle>
                  <CardDescription>Last 10 customer purchases</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab("orders")}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="h-10 w-10 bg-muted rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : serverStats.recentOrders.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {serverStats.recentOrders.map((order) => (
                      <div 
                        key={order.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate text-sm">
                              {order.product_name}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={`shrink-0 text-xs ${
                                order.status === "completed" 
                                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                                  : order.status === "pending"
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  : order.status === "refunded"
                                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                  : "bg-destructive/10 text-destructive border-destructive/20"
                              }`}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span>
                              <span className="font-medium text-foreground">{order.username}</span>
                              {order.quantity > 1 && ` × ${order.quantity}`}
                            </span>
                            <span className="font-medium text-primary">
                              {order.total_real > 0 
                                ? `€${order.total_real.toFixed(2)}`
                                : order.total_coins > 0
                                ? `${order.total_coins.toLocaleString()} Coins`
                                : order.total_zen > 0
                                ? `${order.total_zen.toLocaleString()} Zen`
                                : "Free"
                              }
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            #{order.id} • {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No orders yet</p>
                    <p className="text-sm mt-1">Orders will appear here when customers make purchases</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UsersManager />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrdersManager />
          </TabsContent>

          {/* Votes Tab */}
          <TabsContent value="votes">
            <VoteSitesManager />
          </TabsContent>

          {/* Game Pass Tab */}
          <TabsContent value="gamepass">
            <GamePassRewardsManager username={user?.username} />
          </TabsContent>

          {/* Webshop Tab */}
          <TabsContent value="webshop">
            <WebshopManager />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <NotificationsManager username={user?.username} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
