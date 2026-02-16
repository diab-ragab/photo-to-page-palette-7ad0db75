import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Check, ShieldCheck, Zap, Star, Gift, ArrowRight } from "lucide-react";
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
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {/* Elite Pass */}
      {eliteEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-purple-500/50 via-purple-600/30 to-purple-800/50 opacity-70 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]" />
          <div className="relative rounded-2xl bg-card/90 backdrop-blur-xl overflow-hidden">
            {/* Header */}
            <div className="relative p-6 pb-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 to-transparent" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl">Elite Pass</h3>
                  <p className="text-xs text-muted-foreground">30-day premium access</p>
                </div>
              </div>
              <div className="relative">
                <span className="font-display font-bold text-4xl text-purple-400">
                  €{(elitePriceCents / 100).toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">/month</span>
              </div>
            </div>

            {/* Perks */}
            <div className="px-6 pb-2 space-y-3">
              {elitePerks.map((perk, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-purple-400" />
                  </div>
                  <span className="text-muted-foreground">{perk}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="p-6 pt-4">
              <Button
                onClick={() => handleAddPass("elite")}
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                size="lg"
              >
                <Crown className="w-4 h-4" />
                Get Elite Pass
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Gold Pass */}
      {goldEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative group"
        >
          {/* Animated border glow */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-amber-400/60 via-yellow-500/40 to-orange-500/60 opacity-80 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]" />
          <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" />
          
          <div className="relative rounded-2xl bg-card/90 backdrop-blur-xl overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-4 right-4 z-10">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 text-[10px] uppercase tracking-wider font-display shadow-lg shadow-amber-500/30">
                <Star className="w-3 h-3" /> Best Value
              </Badge>
            </div>

            {/* Header */}
            <div className="relative p-6 pb-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-transparent" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl">Gold Pass</h3>
                  <p className="text-xs text-muted-foreground">Ultimate 30-day experience</p>
                </div>
              </div>
              <div className="relative">
                <span className="font-display font-bold text-4xl text-amber-400">
                  €{(goldPriceCents / 100).toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">/month</span>
              </div>
            </div>

            {/* Perks */}
            <div className="px-6 pb-2 space-y-3">
              {goldPerks.map((perk, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-muted-foreground">{perk}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="p-6 pt-4">
              <Button
                onClick={() => handleAddPass("gold")}
                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                Get Gold Pass
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
