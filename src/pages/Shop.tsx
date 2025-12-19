import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShopHero } from "@/components/shop/ShopHero";
import { ShopCategories } from "@/components/shop/ShopCategories";
import { ShopProducts } from "@/components/shop/ShopProducts";
import { useState } from "react";

export type ShopCategory = "all" | "fashion" | "pets" | "currency";

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>("all");

  return (
    <div className="min-h-screen bg-background text-foreground">
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
