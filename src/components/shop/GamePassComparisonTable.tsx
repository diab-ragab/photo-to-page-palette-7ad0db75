import { motion } from "framer-motion";
import { Check, X, Crown, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComparisonRow {
  feature: string;
  free: boolean | string;
  elite: boolean | string;
  gold: boolean | string;
}

const comparisonData: ComparisonRow[] = [
  { feature: "Daily login rewards", free: true, elite: true, gold: true },
  { feature: "Daily Zen bonus", free: "10", elite: "50", gold: "100 (2×)" },
  { feature: "Daily Coins bonus", free: false, elite: "500", gold: "1500" },
  { feature: "Daily EXP bonus", free: false, elite: "1000", gold: "3000" },
  { feature: "Exclusive items & gear", free: false, elite: true, gold: true },
  { feature: "Gold-only legendary items", free: false, elite: false, gold: true },
  { feature: "In-game badge", free: false, elite: "Elite", gold: "Gold Crown" },
  { feature: "Priority support", free: false, elite: false, gold: true },
  { feature: "Duration", free: "∞", elite: "30 days", gold: "30 days" },
];

const CellValue = ({ value }: { value: boolean | string }) => {
  if (value === true) {
    return (
      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
        <Check className="w-3.5 h-3.5 text-primary" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
        <X className="w-3.5 h-3.5 text-muted-foreground/40" />
      </div>
    );
  }
  return <span className="text-sm font-semibold text-foreground">{value}</span>;
};

interface GamePassComparisonTableProps {
  elitePriceCents: number;
  goldPriceCents: number;
}

export const GamePassComparisonTable = ({ elitePriceCents, goldPriceCents }: GamePassComparisonTableProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <h3 className="text-xl md:text-2xl font-display font-bold mb-2">Compare Tiers</h3>
        <p className="text-sm text-muted-foreground">See what each pass includes</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
        {/* Header */}
        <div className="grid grid-cols-4 gap-0 border-b border-border/50">
          <div className="p-4 flex items-end">
            <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">Feature</span>
          </div>
          {/* Free */}
          <div className="p-4 text-center border-l border-border/30">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="font-display font-bold text-sm">Free</p>
            <p className="text-xs text-muted-foreground">€0</p>
          </div>
          {/* Elite */}
          <div className="p-4 text-center border-l border-border/30 bg-[hsl(270_70%_60%/0.05)]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
              style={{ background: "linear-gradient(135deg, hsl(270 70% 60%), hsl(280 80% 50%))" }}>
              <Crown className="w-4 h-4 text-white" />
            </div>
            <p className="font-display font-bold text-sm">Elite</p>
            <p className="text-xs text-muted-foreground">€{(elitePriceCents / 100).toFixed(2)}</p>
          </div>
          {/* Gold */}
          <div className="p-4 text-center border-l border-border/30 bg-[hsl(38_90%_55%/0.05)] relative overflow-hidden">
            <Badge className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[8px] uppercase tracking-wider font-display px-1.5 py-0.5">
              Best
            </Badge>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
              style={{ background: "linear-gradient(135deg, hsl(38 90% 55%), hsl(25 95% 55%))" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <p className="font-display font-bold text-sm">Gold</p>
            <p className="text-xs text-muted-foreground">€{(goldPriceCents / 100).toFixed(2)}</p>
          </div>
        </div>

        {/* Rows */}
        {comparisonData.map((row, i) => (
          <motion.div
            key={row.feature}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.04 }}
            className={`grid grid-cols-4 gap-0 ${i < comparisonData.length - 1 ? "border-b border-border/30" : ""} hover:bg-muted/20 transition-colors`}
          >
            <div className="p-3 flex items-center">
              <span className="text-sm text-muted-foreground">{row.feature}</span>
            </div>
            <div className="p-3 text-center flex items-center justify-center border-l border-border/20">
              <CellValue value={row.free} />
            </div>
            <div className="p-3 text-center flex items-center justify-center border-l border-border/20 bg-[hsl(270_70%_60%/0.03)]">
              <CellValue value={row.elite} />
            </div>
            <div className="p-3 text-center flex items-center justify-center border-l border-border/20 bg-[hsl(38_90%_55%/0.03)]">
              <CellValue value={row.gold} />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
