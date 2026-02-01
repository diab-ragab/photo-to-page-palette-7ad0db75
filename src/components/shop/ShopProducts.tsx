import { motion } from "framer-motion";
import { ShoppingCart, Sparkles, Star, Minus, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopCategory } from "@/pages/Shop";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { fetchProducts, fetchCategories, WebshopProduct, WebshopCategory } from "@/lib/webshopApi";

const ProductCardSkeleton = () => (
  <div className="glass-card overflow-hidden">
    <Skeleton className="h-40 w-full rounded-none" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  </div>
);

interface ShopProductsProps {
  selectedCategory: ShopCategory;
}

export const ShopProducts = ({ selectedCategory }: ShopProductsProps) => {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<WebshopProduct[]>([]);
  const [categories, setCategories] = useState<WebshopCategory[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts({ limit: 50 }),
          fetchCategories(),
        ]);
        setProducts(productsData.products.filter(p => p.is_active));
        setCategories(categoriesData);
      } catch (error) {
        console.error("Failed to load shop data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Map category slug to filter
  const getCategorySlug = (cat: ShopCategory): string | null => {
    if (cat === "all") return null;
    return cat;
  };

  const filteredProducts = (() => {
    const slug = getCategorySlug(selectedCategory);
    if (!slug) return products;
    
    // Find category by slug
    const category = categories.find(c => c.slug === slug);
    if (!category) return products;
    
    return products.filter(p => p.category_id === category.id);
  })();

  const getQuantity = (id: number) => quantities[id] || 1;
  
  const setQuantity = (id: number, qty: number) => {
    if (qty >= 1 && qty <= 99) {
      setQuantities(prev => ({ ...prev, [id]: qty }));
    }
  };

  const handleAddToCart = (product: WebshopProduct) => {
    const qty = getQuantity(product.id);
    addToCart({
      id: String(product.id),
      name: product.name,
      description: product.description,
      price: product.price_real,
      image: product.image_url || "📦",
      rarity: product.is_featured ? "legendary" : undefined,
    }, qty);
    toast.success(`${product.name} added to cart!`, {
      description: `${qty}x €${product.price_real.toFixed(2)}`,
    });
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const handleBuyNow = (product: WebshopProduct) => {
    if (product.stripe_payment_link) {
      window.open(product.stripe_payment_link, "_blank");
    } else {
      handleAddToCart(product);
    }
  };

  const getProductEmoji = (product: WebshopProduct): string => {
    if (product.image_url && product.image_url.length <= 4) {
      return product.image_url;
    }
    // Default emojis based on category
    const cat = categories.find(c => c.id === product.category_id);
    switch (cat?.slug) {
      case "currency": return "💎";
      case "vip": return "👑";
      case "cosmetics": return "✨";
      case "items": return "📦";
      default: return "🎁";
    }
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          ) : filteredProducts.map((product, index) => (
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
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Product image or emoji */}
                {product.image_url && product.image_url.startsWith("http") ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <motion.span 
                    className="text-6xl relative z-10 transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    {getProductEmoji(product)}
                  </motion.span>
                )}
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                  {product.is_featured && (
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <Star className="w-3 h-3" />
                      Featured
                    </Badge>
                  )}
                  {product.stock > 0 && product.stock <= 10 && (
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Only {product.stock} left
                    </Badge>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-display font-semibold text-lg mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {product.description}
                </p>

                <div className="space-y-3">
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold font-display text-primary">
                      €{Number(product.price_real).toFixed(2)}
                    </span>
                    {product.price_zen > 0 && (
                      <span className="text-sm text-muted-foreground">
                        or {product.price_zen} Zen
                      </span>
                    )}
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQuantity(product.id, getQuantity(product.id) - 1)}
                        disabled={getQuantity(product.id) <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {getQuantity(product.id)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQuantity(product.id, getQuantity(product.id) + 1)}
                        disabled={getQuantity(product.id) >= 99 || (product.stock > 0 && getQuantity(product.id) >= product.stock)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      = €{(Number(product.price_real) * getQuantity(product.id)).toFixed(2)}
                    </span>
                  </div>

                  {/* Buy button */}
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => handleBuyNow(product)}
                    disabled={product.stock === 0}
                  >
                    {product.stripe_payment_link ? (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Buy Now
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t('shop.noProducts')}</p>
          </div>
        )}
      </div>
    </section>
  );
};
