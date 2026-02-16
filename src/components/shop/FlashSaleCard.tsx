import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopProduct } from "@/lib/shopApi";
import { Zap, Coins, Sword, Gift, Plus, Package, Play, X, Eye } from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
  zen: <Zap className="w-3.5 h-3.5" />,
  coins: <Coins className="w-3.5 h-3.5" />,
  exp: <Zap className="w-3.5 h-3.5" />,
  item: <Sword className="w-3.5 h-3.5" />,
  bundle: <Gift className="w-3.5 h-3.5" />,
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

interface FlashSaleCardProps {
  product: ShopProduct;
  index: number;
  onAdd: (product: ShopProduct) => void;
}

export const FlashSaleCard = ({ product, index, onAdd }: FlashSaleCardProps) => {
  const [showMedia, setShowMedia] = useState(false);
  const hasMedia = !!product.image_url;
  const isVideo = hasMedia && isVideoUrl(product.image_url);

  return (
    <>
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

        {/* Image / Video thumbnail */}
        <div
          className="h-36 bg-secondary/30 flex items-center justify-center overflow-hidden relative cursor-pointer"
          onClick={() => hasMedia && setShowMedia(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent z-[1]" />
          {product.image_url ? (
            <>
              {isVideo ? (
                <video
                  src={product.image_url}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              )}
              {/* Preview overlay */}
              <div className="absolute inset-0 z-[2] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                {isVideo ? (
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            </>
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

      {/* Media Preview Modal */}
      <AnimatePresence>
        {showMedia && hasMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowMedia(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative max-w-3xl w-full max-h-[85vh] rounded-2xl overflow-hidden bg-card border border-border/50 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setShowMedia(false)}
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Media */}
              {isVideo ? (
                <video
                  src={product.image_url}
                  className="w-full max-h-[70vh] object-contain bg-black"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              )}

              {/* Info bar */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{product.description}</p>
                  )}
                </div>
                <span className="font-display font-bold text-lg text-primary shrink-0 ml-4">
                  €{(product.price_cents / 100).toFixed(2)}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
