import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShoppingCart, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebshopProduct } from "@/lib/webshopApi";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface FeaturedSpotlightProps {
  products: WebshopProduct[];
}

export const FeaturedSpotlight = ({ products }: FeaturedSpotlightProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { addToCart } = useCart();

  // Pick top 5 products as featured
  const featured = products.slice(0, Math.min(5, products.length));

  useEffect(() => {
    if (featured.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featured.length, isPaused]);

  if (featured.length === 0) return null;

  const product = featured[currentIndex];
  const price = typeof product.price_real === "string" 
    ? parseFloat(product.price_real) 
    : (product.price_real || 0);

  const getEmoji = (p: WebshopProduct) => {
    if (p.image_url && p.image_url.length <= 4) return p.image_url;
    if (p.item_id === -1) return "💎";
    if (p.item_id === -2) return "🪙";
    if (p.item_id === -3) return "⚡";
    return "🎁";
  };

  const handleAdd = () => {
    addToCart({
      id: String(product.id),
      name: product.name,
      description: product.description || "",
      price,
      image: product.image_url || getEmoji(product),
    }, 1);
    toast.success(`${product.name} added to cart!`);
  };

  const prev = () => setCurrentIndex((i) => (i - 1 + featured.length) % featured.length);
  const next = () => setCurrentIndex((i) => (i + 1) % featured.length);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-card via-card to-primary/5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
        {/* Product visual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 15 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="relative flex-shrink-0 w-32 h-32 md:w-44 md:h-44 rounded-2xl bg-gradient-to-br from-secondary/60 to-background flex items-center justify-center shadow-2xl shadow-primary/10 border border-border/50"
          >
            {product.image_url && product.image_url.startsWith("http") ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-7xl md:text-8xl drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                {getEmoji(product)}
              </span>
            )}
            <div className="absolute -top-2 -right-2">
              <Badge className="bg-primary text-primary-foreground shadow-lg gap-1">
                <Sparkles className="h-3 w-3" />
                Featured
              </Badge>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Product info */}
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id + "-info"}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
            className="flex-1 text-center md:text-left"
          >
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
              ★ Spotlight Item
            </p>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              {product.name}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              {product.description || "A premium in-game reward delivered straight to your mailbox."}
            </p>
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <span className="text-3xl font-extrabold text-primary">
                €{price.toFixed(2)}
              </span>
              <Button onClick={handleAdd} size="lg" className="gap-2 shadow-lg shadow-primary/20">
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {featured.length > 1 && (
        <div className="flex items-center justify-center gap-3 pb-5">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
