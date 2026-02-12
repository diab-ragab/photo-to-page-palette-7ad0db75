import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShopHero } from "@/components/shop/ShopHero";
import { ShopCategories } from "@/components/shop/ShopCategories";
import { ShopProducts } from "@/components/shop/ShopProducts";
import { LimitedTimeBundles } from "@/components/shop/LimitedTimeBundles";
import { CurrencyTopUp } from "@/components/shop/CurrencyTopUp";
import { GamePassSection } from "@/components/shop/GamePassSection";
import { SEO } from "@/components/SEO";
import { useState, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export type ShopCategory = "all" | "fashion" | "pets" | "currency" | "passes" | "bundles";

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>("all");
  const [refreshKey, setRefreshKey] = useState(0);

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
      
      <main>
        <PullIndicator />
        {/* Flash Sales Section */}
        <section className="container mx-auto px-4 py-8">
          <LimitedTimeBundles key={`bundles-${refreshKey}`} />
        </section>
      
        {/* Currency Top-Up Section */}
        <section className="container mx-auto px-4 py-8 border-t border-border">
          <CurrencyTopUp key={`topup-${refreshKey}`} />
        </section>

        {/* Game Pass Section */}
        <section className="container mx-auto px-4 py-8 border-t border-border">
          <GamePassSection />
        </section>
        
        <div className="border-t border-border">
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
