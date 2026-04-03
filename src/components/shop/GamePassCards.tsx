import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Star, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE, getAuthHeaders, apiGet } from "@/lib/apiFetch";

interface GamePassCardsProps {
  premiumPriceCents: number;
  premiumEnabled: boolean;
}

const premiumPerks = [
  "30M Zen in 30 Days",
  "Exclusive Fashion & Back",
  "Premium daily rewards (30 days)",
  "Premium crown badge in-game",
  "Priority support",
  "Legendary reward items",
];

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

function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStyle({ rotateX: (y - 0.5) * -20, rotateY: (x - 0.5) * 20, glareX: x * 100, glareY: y * 100 });
  }, []);

  const onLeave = useCallback(() => {
    setStyle({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  }, []);

  return { ref, style, onMove, onLeave };
}

export const GamePassCards = ({ premiumPriceCents, premiumEnabled }: GamePassCardsProps) => {
  const { user } = useAuth();
  const [buying, setBuying] = useState(false);
  const { ref, style, onMove, onLeave } = useTilt();

  const accent = "38 90% 55%";
  const accentAlt = "25 95% 55%";

  useEffect(() => {
    if (!user) return;
    const existing = localStorage.getItem("gamepass_character_name");
    if (existing) return;
    apiGet<any>(`/user_characters.php?rid=${Date.now()}`, true, { showErrorToast: false, silentStatuses: [401, 403] })
      .then(data => {
        if (data?.success && Array.isArray(data.characters) && data.characters.length > 0) {
          const sorted = [...data.characters].sort((a: any, b: any) => (b.level || 0) - (a.level || 0));
          localStorage.setItem("gamepass_character_name", sorted[0].name || sorted[0].Name);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleBuyPass = async () => {
    if (!user) { toast.error("Please log in to purchase a Game Pass"); return; }

    let characterName = localStorage.getItem("gamepass_character_name") || "";
    if (!characterName) {
      try {
        const data = await apiGet<any>(`/user_characters.php?rid=${Date.now()}`, true, { showErrorToast: false });
        if (data?.success && Array.isArray(data.characters) && data.characters.length > 0) {
          const sorted = [...data.characters].sort((a: any, b: any) => (b.level || 0) - (a.level || 0));
          characterName = sorted[0].name || sorted[0].Name;
          localStorage.setItem("gamepass_character_name", characterName);
        }
      } catch {}
    }
    if (!characterName) { toast.error("No characters found. Create a character in-game first."); return; }

    setBuying(true);
    try {
      const res = await fetch(`${API_BASE}/gamepass_purchase.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ character_name: characterName }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        if (data.paypal_order_id) localStorage.setItem("gamepass_paypal_order_id", data.paypal_order_id);
        localStorage.setItem("gamepass_character_name", characterName);
        window.location.href = data.url;
      } else {
        toast.error(data.message || data.error || "Failed to create payment");
      }
    } catch {
      toast.error("Payment error. Please try again.");
    } finally {
      setBuying(false);
    }
  };

  if (!premiumEnabled) return null;

  const holoGradient = `linear-gradient(135deg, hsla(38,90%,55%,0.15) 0%, hsla(45,95%,70%,0.25) 20%, hsla(25,90%,50%,0.1) 40%, hsla(50,100%,75%,0.3) 60%, hsla(38,85%,60%,0.15) 80%, hsla(30,90%,55%,0.2) 100%)`;
  const rainbowFoil = `linear-gradient(${style.rotateY * 3 + 135}deg, hsla(0,85%,65%,0.12), hsla(45,90%,60%,0.15), hsla(120,70%,55%,0.12), hsla(200,80%,60%,0.15), hsla(270,75%,65%,0.12), hsla(330,80%,60%,0.15), hsla(0,85%,65%,0.12))`;

  return (
    <>
      <style>{holoStyles}</style>
      <div className="max-w-md mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 50, rotateX: 10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.1, type: "spring", stiffness: 60, damping: 14 }} className="relative group" style={{ perspective: "1200px" }}>
          <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="relative cursor-pointer transition-[box-shadow] duration-500" style={{ transform: `rotateX(${style.rotateX}deg) rotateY(${style.rotateY}deg)`, transformStyle: "preserve-3d", transition: "transform 0.15s ease-out", animation: "card-float 4s ease-in-out infinite", boxShadow: `0 20px 60px -15px hsla(${accent}, 0.3)` }}>
            <div className="absolute -inset-[2px] rounded-2xl" style={{ background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}), hsl(${accent}))`, backgroundSize: "200% 200%", animation: "holo-shimmer 3s ease infinite", opacity: 0.7 }} />
            <div className="absolute inset-0 rounded-2xl pointer-events-none z-20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: rainbowFoil, backgroundSize: "200% 200%" }} />
            <div className="absolute inset-0 rounded-2xl pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(circle at ${style.glareX}% ${style.glareY}%, hsla(0,0%,100%,0.25) 0%, transparent 60%)` }} />

            <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl overflow-hidden z-10">
              <div className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-500" style={{ background: holoGradient, backgroundSize: "400% 400%", animation: "holo-shimmer 4s ease infinite" }} />

              {[...Array(6)].map((_, i) => (
                <div key={i} className="absolute w-1 h-1 rounded-full pointer-events-none opacity-0 group-hover:opacity-100" style={{ background: `hsl(${accent})`, top: `${15 + Math.random() * 70}%`, left: `${10 + Math.random() * 80}%`, animation: `holo-sparkle ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`, boxShadow: `0 0 6px 2px hsla(${accent}, 0.6)` }} />
              ))}

              <div className="absolute top-4 right-4 z-20">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 200 }}>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 text-[10px] uppercase tracking-wider font-display shadow-lg shadow-amber-500/30">
                    <Star className="w-3 h-3" /> 30 Days
                  </Badge>
                </motion.div>
              </div>

              <div className="relative p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}))`, boxShadow: `0 8px 24px -4px hsla(${accent}, 0.4)` }}>
                    <Crown className="w-7 h-7 text-white drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <h3 className="font-display font-bold text-xl tracking-wide">Premium Pass</h3>
                    <p className="text-xs text-muted-foreground">30-day premium experience</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <motion.span className="font-display font-bold text-5xl" style={{ color: `hsl(${accent})`, textShadow: `0 0 30px hsla(${accent}, 0.3)` }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 120 }}>
                    €{(premiumPriceCents / 100).toFixed(2)}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">/30 days</span>
                </div>
              </div>

              <div className="px-6 pb-3 space-y-3">
                {premiumPerks.map((perk, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06, duration: 0.35 }} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `hsla(${accent}, 0.15)`, boxShadow: `inset 0 0 0 1px hsla(${accent}, 0.3)` }}>
                      <Check className="w-3 h-3" style={{ color: `hsl(${accent})` }} />
                    </div>
                    <span className="text-muted-foreground">{perk}</span>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 pt-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button onClick={handleBuyPass} disabled={buying} className="w-full gap-2 text-white border-0 shadow-lg transition-all duration-300" size="lg" style={{ background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}))`, boxShadow: `0 8px 24px -4px hsla(${accent}, 0.35)` }}>
                    {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                    {buying ? "Redirecting..." : "Buy Premium Pass"}
                    {!buying && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};
