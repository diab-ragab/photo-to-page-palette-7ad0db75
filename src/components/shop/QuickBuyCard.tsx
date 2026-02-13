import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Eye, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebshopProduct } from "@/lib/webshopApi";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface QuickBuyCardProps {
  product: WebshopProduct;
  index: number;
}

export const QuickBuyCard = ({ product, index }: QuickBuyCardProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();

  const price = typeof product.price_real === "string"
    ? parseFloat(product.price_real)
    : (product.price_real || 0);

  const getEmoji = (): string => {
    if (product.image_url && product.image_url.length <= 4) return product.image_url;
    if (product.item_id === -1) return "💎";
    if (product.item_id === -2) return "🪙";
    if (product.item_id === -3) return "⚡";
    return "🎁";
  };

  const getRewardLabel = (): string | null => {
    if (product.item_id === -1) return `${product.item_quantity.toLocaleString()} Zen`;
    if (product.item_id === -2) return `${product.item_quantity.toLocaleString()} Coins`;
    if (product.item_id === -3) return `${product.item_quantity.toLocaleString()} EXP`;
    if (product.item_id > 0) return `x${product.item_quantity}`;
    return null;
  };

  const handleAddToCart = () => {
    addToCart({
      id: String(product.id),
      name: product.name,
      description: product.description || "",
      price,
      image: product.image_url || getEmoji(),
    }, qty);
    toast.success(`${product.name} added to cart!`, {
      description: `${qty}x €${price.toFixed(2)}`,
    });
    setQty(1);
    setShowPreview(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: index * 0.06, type: "spring", stiffness: 100 }}
        className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
      >
        {/* Image area */}
        <div className="relative h-40 bg-gradient-to-br from-secondary/40 to-background flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {product.image_url && product.image_url.startsWith("http") ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <motion.span
              className="text-6xl relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_15px_hsl(var(--primary)/0.5)]"
            >
              {getEmoji()}
            </motion.span>
          )}

          {getRewardLabel() && (
            <div className="absolute top-3 left-3 z-20">
              <Badge className="bg-primary/90 text-primary-foreground text-[10px] backdrop-blur-sm">
                {getRewardLabel()}
              </Badge>
            </div>
          )}

          {/* Quick-buy overlay */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 shadow-lg"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                Quick View
              </Button>
              <Button
                size="sm"
                className="gap-1.5 shadow-lg shadow-primary/20"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-1 truncate text-foreground">{product.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
            {product.description || "In-game reward via mail"}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">€{price.toFixed(2)}</span>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleAddToCart}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick-view modal overlay */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <Badge variant="secondary">Quick View</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-36 rounded-xl bg-gradient-to-br from-secondary/50 to-background flex items-center justify-center mb-4">
              {product.image_url && product.image_url.startsWith("http") ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-7xl">{getEmoji()}</span>
              )}
            </div>

            <h3 className="text-lg font-bold mb-1">{product.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {product.description || "Premium in-game reward delivered via in-game mail."}
            </p>

            {getRewardLabel() && (
              <div className="mb-4">
                <Badge variant="outline">{getRewardLabel()}</Badge>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-primary">€{price.toFixed(2)}</span>
              <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQty(Math.max(1, qty - 1))}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{qty}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQty(Math.min(99, qty + 1))}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-3 text-right">
              Total: €{(price * qty).toFixed(2)}
            </div>

            <Button className="w-full gap-2" onClick={handleAddToCart}>
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
