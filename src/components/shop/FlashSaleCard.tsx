import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopProduct } from "@/lib/shopApi";
import { Zap, Coins, Sword, Gift, Plus, Package } from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
  zen: <Zap className="w-3.5 h-3.5" />,
  coins: <Coins className="w-3.5 h-3.5" />,
  exp: <Zap className="w-3.5 h-3.5" />,
  item: <Sword className="w-3.5 h-3.5" />,
  bundle: <Gift className="w-3.5 h-3.5" />,
};

interface FlashSaleCardProps {
  product: ShopProduct;
  index: number;
  onAdd: (product: ShopProduct) => void;
}

export const FlashSaleCard = ({ product, index, onAdd }: FlashSaleCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl hover:border-primary/50 transition-all duration-300"
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
        style={{ boxShadow: "inset 0 0 40px hsl(175 95% 50% / 0.08)" }} />

      {/* Flash sale badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge className="bg-hdr-orange text-white border-0 gap-1 text-[10px] uppercase tracking-wider font-display shadow-lg">
          <Zap className="w-3 h-3" /> Flash
        </Badge>
      </div>

      {/* Image */}
      <div className="h-36 bg-secondary/30 flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent z-[1]" />
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <Package className="w-12 h-12 text-muted-foreground" />
        )}
      </div>

      <div className="p-4 space-y-3 relative">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] gap-1 font-display uppercase">
            {typeIcons[product.type]}
            {product.type}
          </Badge>
        </div>

        <h3 className="font-display font-bold text-sm leading-tight line-clamp-2">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="font-display font-bold text-lg text-primary">
            €{(product.price_cents / 100).toFixed(2)}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0 rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
            onClick={() => onAdd(product)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
