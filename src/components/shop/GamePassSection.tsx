import { useState, useEffect } from "react";
import { Shield, Crown, Diamond, Check, X, Sparkles, Zap, Gift, Star, Gem, Trophy, Power } from "lucide-react";
import { ElitePassUpsell } from "@/components/ElitePassUpsell";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/lib/apiFetch";
import { motion } from "framer-motion";

const features = [
  { name: "Daily Free Rewards", free: true, elite: true, gold: true, icon: "🎁" },
  { name: "2x Daily Rewards", free: false, elite: true, gold: true, icon: "⚡" },
  { name: "Exclusive Items", free: false, elite: true, gold: true, icon: "✨" },
  { name: "Legendary Gear", free: false, elite: true, gold: true, icon: "🗡️" },
  { name: "Bonus Zen", free: false, elite: true, gold: true, icon: "💰" },
  { name: "Extra Lucky Spins", free: false, elite: true, gold: true, icon: "🎰" },
  { name: "Gold-Only Items", free: false, elite: false, gold: true, icon: "💎" },
  { name: "Mythic Gear", free: false, elite: false, gold: true, icon: "🔮" },
  { name: "Max Zen Bonus", free: false, elite: false, gold: true, icon: "🏆" },
  { name: "All Elite Rewards", free: false, elite: false, gold: true, icon: "👑" },
];

export const GamePassSection = () => {
  const { user } = useAuth();
  const currentTier = (user as any)?.gamepassTier || "free";
  const expiresAt = (user as any)?.gamepassExpiresAt || null;

  const [elitePriceCents, setElitePriceCents] = useState(999);
  const [goldPriceCents, setGoldPriceCents] = useState(1999);
  const [gamepassEnabled, setGamepassEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiGet<any>(`/gamepass.php?action=rewards&rid=${Date.now()}`, false, { showErrorToast: false });
        if (data?.success) {
          if (data.elite_price_cents) setElitePriceCents(data.elite_price_cents);
          if (data.gold_price_cents) setGoldPriceCents(data.gold_price_cents);
          if (data.gamepass_enabled !== undefined) setGamepassEnabled(data.gamepass_enabled);
        }
      } catch {}
      setLoaded(true);
    };
    fetchSettings();
  }, []);

  if (loaded && !gamepassEnabled) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <div className="rounded-2xl border border-border bg-muted/30 p-12 text-center">
            <Power className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Game Pass is Currently Unavailable</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The Game Pass is temporarily disabled. Check back later for updates!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const elitePriceStr = `€${(elitePriceCents / 100).toFixed(2)}`;
  const goldPriceStr = `€${(goldPriceCents / 100).toFixed(2)}`;

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-3">
            <Trophy className="h-4 w-4" />
            Battle Pass
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Choose Your Game Pass
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto mt-2">
            Unlock exclusive daily rewards, rare items, and bonus currency for 30 days
          </p>
        </motion.div>
      </div>

      {/* Tier pricing cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
        {/* Free Tier */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0 }}
          className="relative rounded-2xl border border-border bg-card/50 p-4 md:p-6 text-center group hover:border-muted-foreground/30 transition-all duration-300"
        >
          <div className="p-2.5 md:p-3 rounded-xl bg-muted/50 w-fit mx-auto mb-3">
            <Shield className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
          </div>
          <p className="font-bold text-foreground text-sm md:text-base">Free</p>
          <p className="text-xl md:text-2xl font-extrabold text-muted-foreground mt-1">Free</p>
          <p className="text-[10px] text-muted-foreground mt-1">Basic rewards</p>
        </motion.div>

        {/* Elite Tier */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="relative rounded-2xl border border-amber-500/40 p-4 md:p-6 text-center group hover:border-amber-400/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,179,8,0.04) 50%, rgba(245,158,11,0.08) 100%)"
          }}
        >
          <div className="absolute -top-px left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <div className="p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 w-fit mx-auto mb-3 shadow-lg shadow-amber-500/10">
            <Crown className="h-5 w-5 md:h-6 md:w-6 text-amber-400" />
          </div>
          <p className="font-bold text-amber-200 text-sm md:text-base">Elite</p>
          <p className="text-xl md:text-2xl font-extrabold text-amber-400 mt-1">{elitePriceStr}</p>
          <p className="text-[10px] text-amber-200/60 mt-1">30-day access</p>
        </motion.div>

        {/* Gold Tier - Featured */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative rounded-2xl border border-violet-500/40 p-4 md:p-6 text-center group hover:border-violet-400/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(217,70,239,0.05) 50%, rgba(139,92,246,0.1) 100%)"
          }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-3 py-1 rounded-full shadow-lg shadow-violet-500/30">
              Best Value
            </span>
          </div>
          <div className="absolute -top-px left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-violet-400/20 animate-pulse"
                style={{
                  top: `${20 + i * 25}%`,
                  left: `${15 + i * 25}%`,
                  animationDelay: `${i * 0.5}s`,
                  width: 10,
                  height: 10,
                }}
              />
            ))}
          </div>
          <div className="relative">
            <div className="p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 w-fit mx-auto mb-3 shadow-lg shadow-violet-500/10">
              <Diamond className="h-5 w-5 md:h-6 md:w-6 text-violet-400" />
            </div>
            <p className="font-bold text-violet-200 text-sm md:text-base">Gold</p>
            <p className="text-xl md:text-2xl font-extrabold text-violet-400 mt-1">{goldPriceStr}</p>
            <p className="text-[10px] text-violet-200/60 mt-1">30-day access</p>
          </div>
        </motion.div>
      </div>

      {/* Comparison table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="max-w-3xl mx-auto rounded-2xl border border-border overflow-hidden backdrop-blur-sm"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)"
        }}
      >
        {/* Table header */}
        <div className="grid grid-cols-[1fr_50px_50px_50px] md:grid-cols-[1fr_80px_80px_80px] text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-4 md:px-6 py-3 border-b border-border">
          <span>Feature</span>
          <span className="text-center">
            <Shield className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
          </span>
          <span className="text-center">
            <Crown className="h-3.5 w-3.5 mx-auto text-amber-400" />
          </span>
          <span className="text-center">
            <Diamond className="h-3.5 w-3.5 mx-auto text-violet-400" />
          </span>
        </div>

        {features.map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * i }}
            className={`grid grid-cols-[1fr_50px_50px_50px] md:grid-cols-[1fr_80px_80px_80px] px-4 md:px-6 py-3 text-xs md:text-sm group transition-colors duration-200 hover:bg-muted/30 ${
              i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
            } ${i < features.length - 1 ? "border-b border-border/50" : ""}`}
          >
            <span className="text-foreground flex items-center gap-2">
              <span className="text-sm">{f.icon}</span>
              <span>{f.name}</span>
            </span>
            {(["free", "elite", "gold"] as const).map((tier) => (
              <span key={tier} className="flex justify-center items-center">
                {f[tier] ? (
                  <div className={`p-0.5 rounded-full ${
                    tier === "gold" ? "bg-violet-500/20" : tier === "elite" ? "bg-amber-500/20" : "bg-emerald-500/20"
                  }`}>
                    <Check className={`h-3.5 w-3.5 ${
                      tier === "gold" ? "text-violet-400" : tier === "elite" ? "text-amber-400" : "text-emerald-400"
                    }`} />
                  </div>
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/30" />
                )}
              </span>
            ))}
          </motion.div>
        ))}
      </motion.div>

      {/* Note about mail delivery */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5 border border-border/50">
          <Gift className="h-3.5 w-3.5 text-primary" />
          <span>All Game Pass rewards are delivered via <strong className="text-foreground">in-game mail</strong> to your selected character</span>
        </div>
      </div>

      {/* Purchase cards */}
      <div className="max-w-3xl mx-auto">
        <ElitePassUpsell
          currentTier={currentTier}
          expiresAt={expiresAt}
          elitePriceCents={elitePriceCents}
          goldPriceCents={goldPriceCents}
          gamepassEnabled={gamepassEnabled}
        />
      </div>
    </div>
  );
};