import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { fetchShopProducts, ShopProduct } from "@/lib/shopApi";
import { apiGet } from "@/lib/apiFetch";
import { FlashSaleCard } from "@/components/shop/FlashSaleCard";
import { GamePassCards } from "@/components/shop/GamePassCards";
import { GamePassComparisonTable } from "@/components/shop/GamePassComparisonTable";
import { FlashSaleCountdown } from "@/components/shop/FlashSaleCountdown";
import { GamePassParticles } from "@/components/shop/GamePassParticles";
import { LiveActivityFeed } from "@/components/shop/LiveActivityFeed";
import { GamePassExtendCards } from "@/components/shop/GamePassExtendCards";
import { ShoppingCart, ArrowRight, Zap, Crown, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Shop = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, totalItems } = useCart();
  const { user } = useAuth();

  // Game pass pricing from API
  const [elitePriceCents, setElitePriceCents] = useState(999);
  const [goldPriceCents, setGoldPriceCents] = useState(1999);
  const [eliteEnabled, setEliteEnabled] = useState(true);
  const [goldEnabled, setGoldEnabled] = useState(true);

  // Extension settings
  const [extensionsEnabled, setExtensionsEnabled] = useState(true);
  const [eliteExtendPerDay, setEliteExtendPerDay] = useState(0);
  const [goldExtendPerDay, setGoldExtendPerDay] = useState(0);

  // User's current pass info for extension
  const [userTier, setUserTier] = useState<"free" | "elite" | "gold">("free");
  const [passExpiresAt, setPassExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [shopRes, passRes, settingsRes] = await Promise.all([
          fetchShopProducts({ limit: 200 }),
          apiGet<any>(`/gamepass.php?action=rewards&rid=${Date.now()}`, false, { showErrorToast: false }).catch(() => null),
          import("@/lib/siteSettingsApi").then(m => m.getSiteSettings(true)).catch(() => null),
        ]);
        if (shopRes.success) setProducts(shopRes.products);
        if (passRes?.success) {
          if (passRes.elite_enabled !== undefined) setEliteEnabled(passRes.elite_enabled);
          if (passRes.gold_enabled !== undefined) setGoldEnabled(passRes.gold_enabled);
        }
        // Prices from site_settings take priority
        if (settingsRes) {
          const ep = parseInt(settingsRes.gamepass_elite_price);
          const gp = parseInt(settingsRes.gamepass_gold_price);
          if (!isNaN(ep) && ep > 0) setElitePriceCents(ep);
          if (!isNaN(gp) && gp > 0) setGoldPriceCents(gp);
          // Extension settings
          setExtensionsEnabled(settingsRes.extensions_enabled !== '0');
          const eed = parseInt(settingsRes.elite_extend_per_day_cents);
          const ged = parseInt(settingsRes.gold_extend_per_day_cents);
          // If 0 or unset, auto-calculate from base price / 30
          setEliteExtendPerDay(eed > 0 ? eed : Math.ceil((ep > 0 ? ep : 999) / 30));
          setGoldExtendPerDay(ged > 0 ? ged : Math.ceil((gp > 0 ? gp : 1999) / 30));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch user's current pass tier for extension cards
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("woi_session_token") || localStorage.getItem("sessionToken");
    if (!token) return;
    apiGet<any>(
      `/gamepass.php?action=status&rid=${Date.now()}&sessionToken=${encodeURIComponent(token)}`,
      true,
      { showErrorToast: false, silentStatuses: [401, 403] }
    ).then(data => {
      if (data?.success) {
        const tier = data.user_tier || (data.is_premium ? "elite" : "free");
        setUserTier(tier as "free" | "elite" | "gold");
        if (data.expires_at) setPassExpiresAt(data.expires_at);
      }
    }).catch(() => {});
  }, [user]);

  const handleAdd = (product: ShopProduct, qty = 1) => {
    addToCart({
      id: String(product.id),
      name: product.name,
      description: product.description || "",
      price: product.price_cents / 100,
      image: product.image_url || "📦",
      rarity: product.type,
    }, qty);
    toast.success(`${qty}× ${product.name} added to cart`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Shop"
        description="Flash sales and premium Game Pass for WOI Endgame. Get exclusive rewards, items, and bonuses."
        keywords="WOI shop, game pass, flash sale, elite, gold"
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 hdr-bg opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
              <span className="text-gradient">Shop</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Grab limited-time flash deals & unlock premium Game Pass tiers.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-20 space-y-20">
        {/* Floating cart bar */}
        {totalItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Link to="/cart">
              <Button size="lg" className="gap-3 shadow-xl shadow-primary/20 rounded-full px-8">
                <ShoppingCart className="w-5 h-5" />
                <span>{totalItems} item{totalItems !== 1 ? "s" : ""} in cart</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* ─── FLASH SALES ─── */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hdr-orange to-hdr-magenta flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-display font-bold">Flash Sales</h2>
              <p className="text-sm text-muted-foreground">Limited time offers — grab them while you can!</p>
            </div>
            <FlashSaleCountdown />
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass-card p-4 space-y-3">
                  <Skeleton className="h-36 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl">
              <Package className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground font-display">No flash sales right now</p>
              <p className="text-sm text-muted-foreground mt-1">Check back later for new deals!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product, i) => (
                <FlashSaleCard
                  key={product.id}
                  product={product}
                  index={i}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          )}
        </section>

        {/* ─── DIVIDER ─── */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-6 text-sm text-muted-foreground font-display uppercase tracking-widest">
              Premium
            </span>
          </div>
        </div>

        {/* ─── GAME PASS ─── */}
        <section className="relative">
          <GamePassParticles />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10 relative z-10"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Game Pass</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Unlock exclusive daily rewards, premium items, and in-game perks for 30 days.
            </p>
          </motion.div>

          <GamePassCards
            elitePriceCents={elitePriceCents}
            goldPriceCents={goldPriceCents}
            eliteEnabled={eliteEnabled}
            goldEnabled={goldEnabled}
          />

          {/* Comparison Table */}
          <div className="mt-16">
            <GamePassComparisonTable
              elitePriceCents={elitePriceCents}
              goldPriceCents={goldPriceCents}
            />
          </div>

          {/* Extension Cards — shown only for users with active pass and if enabled */}
          {extensionsEnabled && userTier !== "free" && (
            <div className="mt-16">
              <GamePassExtendCards
                userTier={userTier}
                passExpiresAt={passExpiresAt}
                elitePerDayCents={eliteExtendPerDay}
                goldPerDayCents={goldExtendPerDay}
              />
            </div>
          )}
        </section>

        {/* ─── LIVE ACTIVITY ─── */}
        <LiveActivityFeed />
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
