import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Check, Star, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE, getAuthHeaders } from "@/lib/apiFetch";

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

/* ── holographic CSS ── */
const holoStyles = `
@keyframes holo-shimmer {
  0%   { background-position: 0% 0%; }
  50%  { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}
@keyframes holo-sparkle {
  0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
  50%      { opacity: 1; transform: scale(1) rotate(180deg); }
}
@keyframes card-float {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-6px); }
}
`;

/* ── Tilt hook ── */
function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStyle({
      rotateX: (y - 0.5) * -20,
      rotateY: (x - 0.5) * 20,
      glareX: x * 100,
      glareY: y * 100,
    });
  }, []);

  const onLeave = useCallback(() => {
    setStyle({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  }, []);

  return { ref, style, onMove, onLeave };
}

/* ── Single holographic card ── */
interface HoloCardProps {
  tier: "elite" | "gold";
  perks: string[];
  priceCents: number;
  onBuy: () => void;
  buying: boolean;
  delay: number;
}

const HoloCard = ({ tier, perks, priceCents, onBuy, buying, delay }: HoloCardProps) => {
  const { ref, style, onMove, onLeave } = useTilt();
  const isGold = tier === "gold";

  const accent = isGold ? "38 90% 55%" : "270 70% 60%";
  const accentAlt = isGold ? "25 95% 55%" : "280 80% 50%";
  const holoGradient = isGold
    ? `linear-gradient(
        135deg,
        hsla(38,90%,55%,0.15) 0%,
        hsla(45,95%,70%,0.25) 20%,
        hsla(25,90%,50%,0.1) 40%,
        hsla(50,100%,75%,0.3) 60%,
        hsla(38,85%,60%,0.15) 80%,
        hsla(30,90%,55%,0.2) 100%
      )`
    : `linear-gradient(
        135deg,
        hsla(270,70%,60%,0.15) 0%,
        hsla(300,80%,70%,0.25) 20%,
        hsla(240,60%,65%,0.1) 40%,
        hsla(280,90%,75%,0.3) 60%,
        hsla(260,70%,60%,0.15) 80%,
        hsla(290,80%,55%,0.2) 100%
      )`;

  const rainbowFoil = `linear-gradient(
    ${style.rotateY * 3 + 135}deg,
    hsla(0,85%,65%,0.12),
    hsla(45,90%,60%,0.15),
    hsla(120,70%,55%,0.12),
    hsla(200,80%,60%,0.15),
    hsla(270,75%,65%,0.12),
    hsla(330,80%,60%,0.15),
    hsla(0,85%,65%,0.12)
  )`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay, type: "spring", stiffness: 60, damping: 14 }}
      className="relative group"
      style={{ perspective: "1200px" }}
    >
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative cursor-pointer transition-[box-shadow] duration-500"
        style={{
          transform: `rotateX(${style.rotateX}deg) rotateY(${style.rotateY}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.15s ease-out",
          animation: "card-float 4s ease-in-out infinite",
          boxShadow: `0 20px 60px -15px hsla(${accent}, 0.3), 0 10px 30px -10px hsla(${accent}, 0.15)`,
        }}
      >
        {/* Animated border ring */}
        <div
          className="absolute -inset-[2px] rounded-2xl"
          style={{
            background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}), hsl(${accent}))`,
            backgroundSize: "200% 200%",
            animation: "holo-shimmer 3s ease infinite",
            opacity: 0.7,
          }}
        />

        {/* Rainbow foil overlay */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: rainbowFoil, backgroundSize: "200% 200%" }}
        />

        {/* Glare highlight */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${style.glareX}% ${style.glareY}%, hsla(0,0%,100%,0.25) 0%, transparent 60%)`,
          }}
        />

        {/* Main card body */}
        <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl overflow-hidden z-10">
          {/* Holo pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-500"
            style={{
              background: holoGradient,
              backgroundSize: "400% 400%",
              animation: "holo-shimmer 4s ease infinite",
            }}
          />

          {/* Sparkle dots */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full pointer-events-none opacity-0 group-hover:opacity-100"
              style={{
                background: `hsl(${accent})`,
                top: `${15 + Math.random() * 70}%`,
                left: `${10 + Math.random() * 80}%`,
                animation: `holo-sparkle ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                boxShadow: `0 0 6px 2px hsla(${accent}, 0.6)`,
              }}
            />
          ))}

          {/* Best Value badge (gold only) */}
          {isGold && (
            <div className="absolute top-4 right-4 z-20">
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: delay + 0.4, type: "spring", stiffness: 200 }}
              >
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 text-[10px] uppercase tracking-wider font-display shadow-lg shadow-amber-500/30">
                  <Star className="w-3 h-3" /> Best Value
                </Badge>
              </motion.div>
            </div>
          )}

          {/* Header */}
          <div className="relative p-6 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}))`,
                  boxShadow: `0 8px 24px -4px hsla(${accent}, 0.4)`,
                  transformStyle: "preserve-3d",
                  transform: "translateZ(30px)",
                }}
              >
                {isGold ? (
                  <Sparkles className="w-7 h-7 text-white drop-shadow-lg" />
                ) : (
                  <Crown className="w-7 h-7 text-white drop-shadow-lg" />
                )}
              </motion.div>
              <div style={{ transform: "translateZ(20px)" }}>
                <h3 className="font-display font-bold text-xl tracking-wide">
                  {isGold ? "Gold Pass" : "Elite Pass"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isGold ? "Ultimate 30-day experience" : "30-day premium access"}
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <motion.span
                className="font-display font-bold text-5xl"
                style={{
                  color: `hsl(${accent})`,
                  textShadow: `0 0 30px hsla(${accent}, 0.3)`,
                  transform: "translateZ(15px)",
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: delay + 0.2, type: "spring", stiffness: 120 }}
              >
                €{(priceCents / 100).toFixed(2)}
              </motion.span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          </div>

          {/* Perks */}
          <div className="px-6 pb-3 space-y-3">
            {perks.map((perk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.25 + i * 0.06, duration: 0.35 }}
                className="flex items-center gap-3 text-sm"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: `hsla(${accent}, 0.15)`,
                    boxShadow: `inset 0 0 0 1px hsla(${accent}, 0.3)`,
                  }}
                >
                  <Check className="w-3 h-3" style={{ color: `hsl(${accent})` }} />
                </div>
                <span className="text-muted-foreground">{perk}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="p-6 pt-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={onBuy}
                disabled={buying}
                className="w-full gap-2 text-white border-0 shadow-lg transition-all duration-300"
                size="lg"
                style={{
                  background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}))`,
                  boxShadow: `0 8px 24px -4px hsla(${accent}, 0.35)`,
                }}
              >
                {buying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isGold ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Crown className="w-4 h-4" />
                )}
                {buying ? "Redirecting..." : `Buy ${isGold ? "Gold" : "Elite"} Pass`}
                {!buying && <ArrowRight className="w-4 h-4" />}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Main export ── */
export const GamePassCards = ({ elitePriceCents, goldPriceCents, eliteEnabled, goldEnabled }: GamePassCardsProps) => {
  const { user } = useAuth();
  const [buying, setBuying] = useState<"elite" | "gold" | null>(null);

  const handleBuyPass = async (tier: "elite" | "gold") => {
    if (!user) {
      toast.error("Please log in to purchase a Game Pass");
      return;
    }

    // Get selected character from localStorage (set by GamePass component)
    const characterName = localStorage.getItem("gamepass_character_name") || "";
    if (!characterName) {
      toast.error("Please select a character first in the Game Pass section");
      return;
    }

    setBuying(tier);
    try {
      const token = localStorage.getItem("woi_session_token") || "";
      const res = await fetch(`${API_BASE}/gamepass_purchase.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ tier, character_name: characterName }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        // Redirect to PayPal
        window.location.href = data.url;
      } else {
        toast.error(data.message || data.error || "Failed to create payment");
      }
    } catch (err) {
      toast.error("Payment error. Please try again.");
      console.error("GamePass purchase error:", err);
    } finally {
      setBuying(null);
    }
  };

  return (
    <>
      <style>{holoStyles}</style>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto relative z-10">
        {eliteEnabled && (
          <HoloCard
            tier="elite"
            perks={elitePerks}
            priceCents={elitePriceCents}
            onBuy={() => handleBuyPass("elite")}
            buying={buying === "elite"}
            delay={0.1}
          />
        )}
        {goldEnabled && (
          <HoloCard
            tier="gold"
            perks={goldPerks}
            priceCents={goldPriceCents}
            onBuy={() => handleBuyPass("gold")}
            buying={buying === "gold"}
            delay={0.2}
          />
        )}
      </div>
    </>
  );
};
