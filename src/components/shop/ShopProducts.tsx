import { motion } from "framer-motion";
import { ShoppingCart, Star, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopCategory } from "@/pages/Shop";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { fetchProducts, WebshopProduct } from "@/lib/webshopApi";

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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const productsData = await fetchProducts({ limit: 50 });
        // Filter only active products
        setProducts(productsData.products.filter(p => p.is_active !== false));
      } catch (error) {
        console.error("Failed to load shop data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter by item_id type (currency = negative, items = positive)
  const filteredProducts = (() => {
    if (selectedCategory === "all") return products;
    if (selectedCategory === "currency") {
      // Zen (-1), Coins (-2), EXP (-3)
      return products.filter(p => p.item_id < 0);
    }
    // All other categories = real items
    return products.filter(p => p.item_id > 0);
  })();

  const getQuantity = (id: number) => quantities[id] || 1;
  
  const setQuantity = (id: number, qty: number) => {
    if (qty >= 1 && qty <= 99) {
      setQuantities(prev => ({ ...prev, [id]: qty }));
    }
  };

  const handleAddToCart = (product: WebshopProduct) => {
    const qty = getQuantity(product.id);
    const price = typeof product.price_real === 'string' 
      ? parseFloat(product.price_real) 
      : (product.price_real || 0);
    addToCart({
      id: String(product.id),
      name: product.name,
      description: product.description || "",
      price: price,
      image: product.image_url || getProductEmoji(product),
    }, qty);
    toast.success(`${product.name} added to cart!`, {
      description: `${qty}x €${price.toFixed(2)}`,
    });
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const getProductEmoji = (product: WebshopProduct): string => {
    if (product.image_url && product.image_url.length <= 4) {
      return product.image_url;
    }
    // Default emojis based on item_id type
    if (product.item_id === -1) return "💎"; // Zen
    if (product.item_id === -2) return "🪙"; // Coins
    if (product.item_id === -3) return "⚡"; // EXP
    return "🎁"; // Regular item
  };

  const getRewardLabel = (product: WebshopProduct): string | null => {
    if (product.item_id === -1) return `${product.item_quantity.toLocaleString()} Zen`;
    if (product.item_id === -2) return `${product.item_quantity.toLocaleString()} Coins`;
    if (product.item_id === -3) return `${product.item_quantity.toLocaleString()} EXP`;
    if (product.item_id > 0) return `x${product.item_quantity}`;
    return null;
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
                
                {/* Reward badge */}
                {getRewardLabel(product) && (
                  <div className="absolute top-3 left-3 z-20">
                    <Badge className="bg-primary text-primary-foreground">
                      {getRewardLabel(product)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-display font-semibold text-lg mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {product.description || "In-game reward delivered via mail"}
                </p>

                <div className="space-y-3">
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold font-display text-primary">
                      €{Number(product.price_real || 0).toFixed(2)}
                    </span>
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
                        disabled={getQuantity(product.id) >= 99}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      = €{(Number(product.price_real || 0) * getQuantity(product.id)).toFixed(2)}
                    </span>
                  </div>

                  {/* Buy button */}
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
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
