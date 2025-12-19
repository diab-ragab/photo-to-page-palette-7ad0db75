import { motion } from "framer-motion";
import { ShoppingCart, Sparkles, Star, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopCategory } from "@/pages/Shop";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "fashion" | "pets" | "currency";
  image: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
  popular?: boolean;
  bonus?: string;
}

const products: Product[] = [
  // Fashion & Backgears
  {
    id: "fashion-1",
    name: "Dragon Wings",
    description: "Legendary backgear with flame effects",
    price: 29.99,
    category: "fashion",
    image: "🐉",
    rarity: "legendary",
    popular: true,
  },
  {
    id: "fashion-2",
    name: "Angel Aura Set",
    description: "Complete fashion set with divine glow",
    price: 19.99,
    category: "fashion",
    image: "👼",
    rarity: "epic",
  },
  {
    id: "fashion-3",
    name: "Shadow Cloak",
    description: "Dark themed backgear with particles",
    price: 14.99,
    category: "fashion",
    image: "🦇",
    rarity: "rare",
  },
  {
    id: "fashion-4",
    name: "Phoenix Feathers",
    description: "Fiery backgear with ember trail",
    price: 24.99,
    category: "fashion",
    image: "🔥",
    rarity: "epic",
    popular: true,
  },
  // Pet Eggs
  {
    id: "pet-1",
    name: "Rare Pet Egg",
    description: "Chance for rare companion pets",
    price: 4.99,
    category: "pets",
    image: "🥚",
    rarity: "rare",
  },
  {
    id: "pet-2",
    name: "Epic Pet Egg",
    description: "Higher chance for epic pets",
    price: 9.99,
    category: "pets",
    image: "🥚",
    rarity: "epic",
    popular: true,
  },
  {
    id: "pet-3",
    name: "Legendary Pet Egg",
    description: "Guaranteed epic or legendary pet",
    price: 19.99,
    category: "pets",
    image: "🥚",
    rarity: "legendary",
  },
  {
    id: "pet-4",
    name: "Pet Egg Bundle x10",
    description: "10 random rare+ eggs with bonus",
    price: 39.99,
    category: "pets",
    image: "📦",
    rarity: "epic",
    bonus: "+2 Free Eggs",
  },
  // Currency
  {
    id: "currency-1",
    name: "1000 Zen",
    description: "Premium currency for shop items",
    price: 4.99,
    category: "currency",
    image: "💎",
  },
  {
    id: "currency-2",
    name: "5000 Zen",
    description: "Premium currency pack",
    price: 19.99,
    category: "currency",
    image: "💎",
    bonus: "+500 Bonus",
    popular: true,
  },
  {
    id: "currency-3",
    name: "10M Gold Coins",
    description: "In-game gold currency",
    price: 9.99,
    category: "currency",
    image: "🪙",
  },
  {
    id: "currency-4",
    name: "50M Gold Coins",
    description: "Large gold pack for upgrades",
    price: 39.99,
    category: "currency",
    image: "🪙",
    bonus: "+10M Bonus",
  },
];

const rarityColors = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

interface ShopProductsProps {
  selectedCategory: ShopCategory;
}

export const ShopProducts = ({ selectedCategory }: ShopProductsProps) => {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const getQuantity = (id: string) => quantities[id] || 1;
  
  const setQuantity = (id: string, qty: number) => {
    if (qty >= 1 && qty <= 99) {
      setQuantities(prev => ({ ...prev, [id]: qty }));
    }
  };

  const handleAddToCart = (product: Product) => {
    const qty = getQuantity(product.id);
    addToCart({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      rarity: product.rarity,
    }, qty);
    toast.success(`${product.name} added to cart!`, {
      description: `${qty}x €${product.price.toFixed(2)}`,
    });
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="glass-card overflow-hidden group hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
            >
              {/* Product Image/Icon */}
              <div className="relative h-40 bg-gradient-to-br from-secondary/50 to-background flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="text-6xl group-hover:scale-110 group-hover:drop-shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-300">
                  {product.image}
                </span>
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {product.popular && (
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <Star className="w-3 h-3" />
                      Popular
                    </Badge>
                  )}
                  {product.rarity && (
                    <Badge variant="outline" className={rarityColors[product.rarity]}>
                      {product.rarity.charAt(0).toUpperCase() + product.rarity.slice(1)}
                    </Badge>
                  )}
                </div>
                
                {product.bonus && (
                  <Badge className="absolute top-3 right-3 bg-primary/90 text-primary-foreground gap-1">
                    <Sparkles className="w-3 h-3" />
                    {product.bonus}
                  </Badge>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-display font-semibold text-lg mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {product.description}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold font-display text-primary">
                      €{product.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(product.id, getQuantity(product.id) - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold text-sm">
                        {getQuantity(product.id)}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(product.id, getQuantity(product.id) + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {t('shop.addToCart')}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t('shop.noProducts')}</p>
          </div>
        )}
      </div>
    </section>
  );
};
