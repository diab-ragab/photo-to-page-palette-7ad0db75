import { Shield, Crown, Diamond, Check, X } from "lucide-react";
import { ElitePassUpsell } from "@/components/ElitePassUpsell";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { name: "Daily Free Rewards", free: true, elite: true, gold: true },
  { name: "2x Daily Rewards", free: false, elite: true, gold: true },
  { name: "Exclusive Items", free: false, elite: true, gold: true },
  { name: "Legendary Gear", free: false, elite: true, gold: true },
  { name: "Bonus Zen", free: false, elite: true, gold: true },
  { name: "Gold-Only Items", free: false, elite: false, gold: true },
  { name: "Mythic Gear", free: false, elite: false, gold: true },
  { name: "Max Zen Bonus", free: false, elite: false, gold: true },
  { name: "All Elite Rewards", free: false, elite: false, gold: true },
];

const tiers = [
  { key: "free" as const, label: "Free", icon: Shield, color: "text-muted-foreground", border: "border-border", bg: "bg-muted/30" },
  { key: "elite" as const, label: "Elite", icon: Crown, color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" },
  { key: "gold" as const, label: "Gold", icon: Diamond, color: "text-violet-400", border: "border-violet-500/30", bg: "bg-violet-500/10" },
];

export const GamePassSection = () => {
  const { user } = useAuth();
  const currentTier = (user as any)?.gamepassTier || "free";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          🎖️ Game Pass
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Upgrade your pass to unlock exclusive daily rewards for 30 days
        </p>
      </div>

      {/* Tier pricing headers */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
        {tiers.map((t) => (
          <div key={t.key} className={`rounded-xl border ${t.border} ${t.bg} p-4 text-center`}>
            <t.icon className={`h-6 w-6 mx-auto mb-2 ${t.color}`} />
            <p className="font-bold text-foreground text-sm">{t.label}</p>
            <p className={`text-lg font-extrabold ${t.color}`}>
              {t.key === "free" ? "Free" : t.key === "elite" ? "€9.99" : "€19.99"}
            </p>
            {t.key !== "free" && (
              <p className="text-[10px] text-muted-foreground mt-1">30-day access</p>
            )}
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="max-w-2xl mx-auto rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_60px_60px] text-xs font-semibold text-muted-foreground bg-muted/50 px-4 py-2">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center text-amber-400">Elite</span>
          <span className="text-center text-violet-400">Gold</span>
        </div>
        {features.map((f, i) => (
          <div
            key={f.name}
            className={`grid grid-cols-[1fr_60px_60px_60px] px-4 py-2.5 text-xs ${
              i % 2 === 0 ? "bg-background" : "bg-muted/20"
            }`}
          >
            <span className="text-foreground">{f.name}</span>
            {(["free", "elite", "gold"] as const).map((tier) => (
              <span key={tier} className="flex justify-center">
                {f[tier] ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/40" />
                )}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Purchase cards */}
      <div className="max-w-2xl mx-auto">
        <ElitePassUpsell currentTier={currentTier} />
      </div>
    </div>
  );
};
