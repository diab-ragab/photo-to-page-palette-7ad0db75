import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Check, Star, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface GamePassCardsProps {
  elitePriceCents: number;
  goldPriceCents: number;
  eliteEnabled: boolean;
  goldEnabled: boolean;
}

const elitePerks = [
  "Elite daily rewards (30 days)",
  "Exclusive elite items & gear",
  "Bonus Coins & EXP daily",
  "Elite badge in-game",
];

const goldPerks = [
  "Everything in Elite",
  "Gold-tier legendary rewards",
  "Double daily Zen bonus",
  "Gold crown badge in-game",
  "Priority support",
  "Exclusive Gold-only items",
];

const shimmerStyle = `
@keyframes card-shimmer {
  0% { transform: translateX(-100%) rotate(15deg); }
  100% { transform: translateX(200%) rotate(15deg); }
}
@keyframes float-icon {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(5deg); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.15); }
}
@keyframes border-rotate {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;

export const GamePassCards = ({ elitePriceCents, goldPriceCents, eliteEnabled, goldEnabled }: GamePassCardsProps) => {
  const { addToCart } = useCart();

  const handleAddPass = (tier: "elite" | "gold") => {
    const isElite = tier === "elite";
    addToCart({
      id: isElite ? "gamepass-elite" : "gamepass-gold",
      name: isElite ? "Elite Game Pass" : "Gold Game Pass",
      description: isElite ? "30 days of Elite rewards" : "30 days of Gold rewards",
      price: isElite ? elitePriceCents / 100 : goldPriceCents / 100,
      image: isElite ? "👑" : "💎",
      rarity: tier,
    });
    toast.success(`${isElite ? "Elite" : "Gold"} Game Pass added to cart`);
  };

  return (
    <>
      <style>{shimmerStyle}</style>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto relative z-10">
        {/* Elite Pass */}
        {eliteEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 80, damping: 15 }}
            whileHover={{ y: -6, transition: { duration: 0.3, ease: "easeOut" } }}
            className="relative group cursor-pointer"
          >
            {/* Animated border */}
            <div
              className="absolute -inset-[2px] rounded-2xl opacity-60 group-hover:opacity-100 transition-all duration-700"
              style={{
                background: "linear-gradient(135deg, hsl(270 70% 55%), hsl(280 80% 45%), hsl(260 60% 65%), hsl(270 70% 55%))",
                backgroundSize: "300% 300%",
                animation: "border-rotate 4s ease infinite",
              }}
            />

            <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
              {/* Shimmer sweep */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, hsla(270,80%,70%,0.12) 45%, hsla(270,80%,80%,0.2) 50%, hsla(270,80%,70%,0.12) 55%, transparent 100%)",
                    animation: "card-shimmer 2s ease-in-out infinite",
                  }}
                />
              </div>

              {/* Pulsing glow orb */}
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, hsla(270,70%,60%,0.3), transparent 70%)",
                  animation: "pulse-glow 3s ease-in-out infinite",
                }}
              />

              {/* Header */}
              <div className="relative p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30"
                    style={{ animation: "float-icon 3s ease-in-out infinite" }}
                  >
                    <Crown className="w-7 h-7 text-white drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <h3 className="font-display font-bold text-xl tracking-wide">Elite Pass</h3>
                    <p className="text-xs text-muted-foreground">30-day premium access</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <motion.span
                    className="font-display font-bold text-5xl"
                    style={{ color: "hsl(270 70% 65%)" }}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
                  >
                    €{(elitePriceCents / 100).toFixed(2)}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </div>

              {/* Perks */}
              <div className="px-6 pb-3 space-y-3">
                {elitePerks.map((perk, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 ring-1 ring-purple-500/30">
                      <Check className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-muted-foreground">{perk}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="p-6 pt-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => handleAddPass("elite")}
                    className="w-full gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/50 transition-all duration-300"
                    size="lg"
                  >
                    <Crown className="w-4 h-4" />
                    Get Elite Pass
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Gold Pass */}
        {goldEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 80, damping: 15 }}
            whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
            className="relative group cursor-pointer"
          >
            {/* Animated border */}
            <div
              className="absolute -inset-[2px] rounded-2xl opacity-70 group-hover:opacity-100 transition-all duration-700"
              style={{
                background: "linear-gradient(135deg, hsl(38 90% 55%), hsl(25 95% 55%), hsl(45 85% 60%), hsl(38 90% 55%))",
                backgroundSize: "300% 300%",
                animation: "border-rotate 3s ease infinite",
              }}
            />
            {/* Extra outer glow on hover */}
            <div
              className="absolute -inset-[4px] rounded-2xl opacity-0 group-hover:opacity-60 transition-all duration-700 blur-sm"
              style={{
                background: "linear-gradient(135deg, hsl(38 90% 55%), hsl(25 95% 55%), hsl(45 85% 60%))",
                backgroundSize: "300% 300%",
                animation: "border-rotate 3s ease infinite",
              }}
            />

            <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
              {/* Shimmer sweep */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, hsla(38,90%,65%,0.12) 45%, hsla(38,90%,75%,0.22) 50%, hsla(38,90%,65%,0.12) 55%, transparent 100%)",
                    animation: "card-shimmer 1.8s ease-in-out infinite",
                  }}
                />
              </div>

              {/* Pulsing glow orb */}
              <div
                className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, hsla(38,90%,55%,0.25), transparent 70%)",
                  animation: "pulse-glow 2.5s ease-in-out infinite",
                }}
              />

              {/* Best Value badge */}
              <div className="absolute top-4 right-4 z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                >
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 text-[10px] uppercase tracking-wider font-display shadow-lg shadow-amber-500/30">
                    <Star className="w-3 h-3" /> Best Value
                  </Badge>
                </motion.div>
              </div>

              {/* Header */}
              <div className="relative p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
                    style={{ animation: "float-icon 2.5s ease-in-out infinite 0.3s" }}
                  >
                    <Sparkles className="w-7 h-7 text-white drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <h3 className="font-display font-bold text-xl tracking-wide">Gold Pass</h3>
                    <p className="text-xs text-muted-foreground">Ultimate 30-day experience</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <motion.span
                    className="font-display font-bold text-5xl"
                    style={{ color: "hsl(38 90% 55%)" }}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 120 }}
                  >
                    €{(goldPriceCents / 100).toFixed(2)}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </div>

              {/* Perks */}
              <div className="px-6 pb-3 space-y-3">
                {goldPerks.map((perk, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.07, duration: 0.4 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 ring-1 ring-amber-500/30">
                      <Check className="w-3 h-3 text-amber-400" />
                    </div>
                    <span className="text-muted-foreground">{perk}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="p-6 pt-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => handleAddPass("gold")}
                    className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/50 transition-all duration-300"
                    size="lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    Get Gold Pass
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
};
