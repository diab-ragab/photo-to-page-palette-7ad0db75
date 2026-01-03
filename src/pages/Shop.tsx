import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShopHero } from "@/components/shop/ShopHero";
import { ShopCategories } from "@/components/shop/ShopCategories";
import { ShopProducts } from "@/components/shop/ShopProducts";
import { SEO } from "@/components/SEO";
import { useState } from "react";

export type ShopCategory = "all" | "fashion" | "pets" | "currency" | "passes";

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>("all");

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
    <div className="min-h-screen bg-background text-foreground">
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
      <ShopCategories 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />
      <ShopProducts selectedCategory={selectedCategory} />
      <Footer />
    </div>
  );
};

export default Shop;
