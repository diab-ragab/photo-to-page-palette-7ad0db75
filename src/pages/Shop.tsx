import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShopHero } from "@/components/shop/ShopHero";
import { ShopCategories } from "@/components/shop/ShopCategories";
import { ShopProducts } from "@/components/shop/ShopProducts";
import { LimitedTimeBundles } from "@/components/shop/LimitedTimeBundles";
import { GamePassSection } from "@/components/shop/GamePassSection";
import { FeaturedSpotlight } from "@/components/shop/FeaturedSpotlight";
import { SEO } from "@/components/SEO";
import { useState, useEffect } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { fetchProducts, WebshopProduct } from "@/lib/webshopApi";

export type ShopCategory = "all" | "fashion" | "pets" | "currency" | "passes" | "bundles";

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [spotlightProducts, setSpotlightProducts] = useState<WebshopProduct[]>([]);

  useEffect(() => {
    fetchProducts({ limit: 10 }).then((res) => {
      const list = Array.isArray(res?.products) ? res.products.filter(p => p.is_active !== false) : [];
      setSpotlightProducts(list);
    }).catch(() => {});
  }, [refreshKey]);

  const { containerProps, PullIndicator } = usePullToRefresh({
    onRefresh: async () => {
      setRefreshKey(k => k + 1);
    },
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "WOI Endgame Shop",
    description: "Browse exclusive in-game items, fashion, pets, and currency for WOI Endgame.",
    url: typeof window !== "undefined" ? `${window.location.origin}/shop` : "",
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Shop", url: `${baseUrl}/shop` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" {...containerProps}>
      <SEO 
        title="Shop"
        description="Browse and purchase exclusive in-game items, fashion, pets, and currency for WOI Endgame private server. Fast delivery and secure checkout."
        keywords="WOI shop, game items, in-game currency, pets, fashion, WOI Endgame store"
        ogType="website"
        structuredData={structuredData}
        breadcrumbs={breadcrumbs}
      />
      <Navbar />
      <ShopHero />
      
      <main className="space-y-0">
        <PullIndicator />

        {/* Featured Spotlight */}
        <section className="container mx-auto px-4 py-8">
          <FeaturedSpotlight products={spotlightProducts} />
        </section>

        {/* Flash Sales Section */}
        <section className="container mx-auto px-4 py-8 border-t border-border/50">
          <LimitedTimeBundles key={`bundles-${refreshKey}`} />
        </section>

        {/* Game Pass Section */}
        <section className="container mx-auto px-4 py-8 border-t border-border/50">
          <GamePassSection />
        </section>
        
        {/* Products Grid */}
        <div className="border-t border-border/50">
          <ShopCategories 
            selectedCategory={selectedCategory} 
            onSelectCategory={setSelectedCategory} 
          />
          <ShopProducts selectedCategory={selectedCategory} key={`products-${refreshKey}`} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Shop;
