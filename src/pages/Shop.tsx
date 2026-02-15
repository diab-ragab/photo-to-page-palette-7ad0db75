import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { fetchShopProducts, ShopProduct } from "@/lib/shopApi";
import { Search, ShoppingCart, Plus, Package, Coins, Zap, Sword, Gift, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type FilterType = "all" | "zen" | "coins" | "exp" | "item" | "bundle";

const typeIcons: Record<string, React.ReactNode> = {
  zen: <Zap className="w-4 h-4" />,
  coins: <Coins className="w-4 h-4" />,
  exp: <Zap className="w-4 h-4" />,
  item: <Sword className="w-4 h-4" />,
  bundle: <Gift className="w-4 h-4" />,
};

const typeLabels: Record<string, string> = {
  all: "All",
  zen: "Zen",
  coins: "Coins",
  exp: "EXP",
  item: "Items",
  bundle: "Bundles",
};

const Shop = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const { addToCart, totalItems } = useCart();

  useEffect(() => {
    fetchShopProducts({ limit: 200 })
      .then((res) => {
        if (res.success) setProducts(res.products);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (filter !== "all") list = list.filter((p) => p.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, filter, search]);

  const handleAdd = (product: ShopProduct) => {
    addToCart({
      id: String(product.id),
      name: product.name,
      description: product.description || "",
      price: product.price_cents / 100,
      image: product.image_url || "📦",
      rarity: product.type,
    });
    toast.success(`${product.name} added to cart`);
  };

  const filters: FilterType[] = ["all", "zen", "coins", "exp", "item", "bundle"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Shop"
        description="Browse and purchase exclusive in-game items, Zen, Coins, EXP and bundles for WOI Endgame."
        keywords="WOI shop, game items, zen, coins, bundles"
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 hdr-bg opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              <span className="text-gradient">Shop</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Browse our collection of in-game items, currency, and bundles.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-16">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filters.map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="gap-1"
              >
                {f !== "all" && typeIcons[f]}
                {typeLabels[f]}
              </Button>
            ))}
          </div>
        </div>

        {/* Cart indicator */}
        {totalItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 glass-card p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="font-medium">{totalItems} item{totalItems !== 1 ? "s" : ""} in cart</span>
            </div>
            <Link to="/cart">
              <Button size="sm" className="gap-1">
                View Cart <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="glass-card p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                className="glass-card overflow-hidden group hover:border-primary/50 transition-colors"
              >
                {/* Image */}
                <div className="h-32 bg-secondary/30 flex items-center justify-center text-4xl overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs gap-1">
                      {typeIcons[product.type]}
                      {product.type}
                    </Badge>
                  </div>
                  <h3 className="font-display font-semibold text-sm leading-tight line-clamp-2">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-bold text-primary">
                      €{(product.price_cents / 100).toFixed(2)}
                    </span>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleAdd(product)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
