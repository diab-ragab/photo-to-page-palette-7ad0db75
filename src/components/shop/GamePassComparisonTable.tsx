import { motion } from "framer-motion";
import { Check, X, Crown, Zap } from "lucide-react";

interface ComparisonRow {
  feature: string;
  free: boolean | string;
  premium: boolean | string;
}

const comparisonData: ComparisonRow[] = [
  { feature: "Daily login rewards", free: true, premium: true },
  { feature: "Daily Zen bonus", free: "10", premium: "100" },
  { feature: "Daily Coins bonus", free: false, premium: "1500" },
  { feature: "Daily EXP bonus", free: false, premium: "3000" },
  { feature: "Exclusive items & gear", free: false, premium: true },
  { feature: "Legendary items", free: false, premium: true },
  { feature: "In-game badge", free: false, premium: "Premium Crown" },
  { feature: "Priority support", free: false, premium: true },
  { feature: "Duration", free: "∞", premium: "30 days" },
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
  premiumPriceCents: number;
}

export const GamePassComparisonTable = ({ premiumPriceCents }: GamePassComparisonTableProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <h3 className="text-xl md:text-2xl font-display font-bold mb-2">Compare Tiers</h3>
        <p className="text-sm text-muted-foreground">See what each pass includes</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="min-w-[400px]">
            {/* Header */}
            <div className="grid grid-cols-[minmax(140px,1.5fr)_repeat(2,1fr)] gap-0 border-b border-border/50">
              <div className="p-4 flex items-end sticky left-0 bg-card/95 backdrop-blur-sm z-10">
                <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">Feature</span>
              </div>
              <div className="p-4 text-center border-l border-border/30">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="font-display font-bold text-sm">Free</p>
                <p className="text-xs text-muted-foreground">€0</p>
              </div>
              <div className="p-4 text-center border-l border-border/30 bg-amber-500/5 relative overflow-hidden">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                  style={{ background: "linear-gradient(135deg, hsl(38 90% 55%), hsl(25 95% 55%))" }}>
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <p className="font-display font-bold text-sm">Premium</p>
                <p className="text-xs text-muted-foreground">€{(premiumPriceCents / 100).toFixed(2)}</p>
              </div>
            </div>

            {/* Rows */}
            {comparisonData.map((row, i) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                className={`grid grid-cols-[minmax(140px,1.5fr)_repeat(2,1fr)] gap-0 ${i < comparisonData.length - 1 ? "border-b border-border/30" : ""} hover:bg-muted/20 transition-colors`}
              >
                <div className="p-3 flex items-center sticky left-0 bg-card/95 backdrop-blur-sm z-10">
                  <span className="text-sm text-muted-foreground">{row.feature}</span>
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-border/20">
                  <CellValue value={row.free} />
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-border/20 bg-amber-500/[0.03]">
                  <CellValue value={row.premium} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
