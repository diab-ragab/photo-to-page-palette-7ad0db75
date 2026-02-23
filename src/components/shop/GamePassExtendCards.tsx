import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Clock, ArrowRight, Loader2, CalendarPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/apiFetch";
import { toast } from "sonner";

interface ExtendOption {
  days: number;
  label: string;
  popular?: boolean;
}

const extendOptions: ExtendOption[] = [
  { days: 30, label: "30 Days" },
  { days: 60, label: "60 Days", popular: true },
  { days: 90, label: "90 Days" },
];

interface GamePassExtendCardsProps {
  userTier: "free" | "elite" | "gold";
  passExpiresAt: string | null;
  passRemainingDays?: number;
  elitePerDayCents: number;
  goldPerDayCents: number;
}

export const GamePassExtendCards = ({ userTier, passExpiresAt, passRemainingDays, elitePerDayCents, goldPerDayCents }: GamePassExtendCardsProps) => {
  const { user } = useAuth();
  const [loadingDays, setLoadingDays] = useState<number | null>(null);

  if (!user || userTier === "free") return null;

  const isGold = userTier === "gold";
  const tierLabel = isGold ? "Gold" : "Elite";
  const accent = isGold ? "38 90% 55%" : "270 70% 60%";
  const accentAlt = isGold ? "25 95% 55%" : "280 80% 50%";

  // Use remaining_days from API if available, otherwise fallback to expires_at calculation
  const daysLeft = passRemainingDays !== undefined
    ? passRemainingDays
    : (passExpiresAt
      ? Math.max(0, Math.ceil((new Date(passExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0);

  const handleExtend = async (days: number) => {
    setLoadingDays(days);
    try {
      const data = await apiPost<any>(
        `/gamepass_extend.php`,
        { tier: userTier, days },
        true,
        { showErrorToast: true }
      );

      if (data?.success && data.url) {
        toast.success(`Redirecting to payment for ${days}-day extension...`);
        if (data.paypal_order_id) {
          localStorage.setItem("gamepass_extend_paypal_order_id", data.paypal_order_id);
        }
        window.location.href = data.url;
      } else {
        toast.error(data?.error || "Failed to create extension order");
      }
    } catch (err: any) {
      const msg = err?.serverMessage || "Connection error — please try again.";
      toast.error(msg);
    } finally {
      setLoadingDays(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CalendarPlus className="h-5 w-5" style={{ color: `hsl(${accent})` }} />
          <h3 className="text-xl md:text-2xl font-display font-bold">
            Extend Your {tierLabel} Pass
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {daysLeft > 0 ? (
            <>
              <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining — add more time to keep your perks!
            </>
          ) : (
            "Your pass has expired. Renew now to continue receiving daily rewards!"
          )}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          ✨ Extensions stack on your current expiry — your pass auto-continues into new cycles.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {extendOptions.map((opt, i) => (
          <motion.div
            key={opt.days}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="relative"
          >
            {opt.popular && (
              <Badge
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 border-0 text-[10px] uppercase tracking-wider font-display px-2 py-0.5 text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}))`,
                  boxShadow: `0 4px 12px hsla(${accent}, 0.3)`,
                }}
              >
                Popular
              </Badge>
            )}
            <div
              className={`
                glass-card rounded-2xl p-5 text-center border-2 transition-all duration-300
                hover:scale-[1.02] hover:shadow-lg
                ${opt.popular ? "border-opacity-70" : "border-border/50"}
              `}
              style={{
                borderColor: opt.popular ? `hsl(${accent})` : undefined,
                boxShadow: opt.popular ? `0 0 20px hsla(${accent}, 0.15)` : undefined,
              }}
            >
              <div className="mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md"
                  style={{
                    background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}))`,
                  }}
                >
                  {isGold ? (
                    <Sparkles className="w-5 h-5 text-white" />
                  ) : (
                    <Crown className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className="text-2xl font-display font-bold">{opt.days}</span>
                <span className="text-sm text-muted-foreground ml-1">days</span>
                {(() => {
                  const perDay = isGold ? goldPerDayCents : elitePerDayCents;
                  const total = Math.max(50, perDay * opt.days);
                  const base = new Date();
                  const newDate = new Date(base.getTime() + (daysLeft + opt.days) * 86400000);
                  return (
                    <>
                      <p className="text-lg font-display font-bold mt-1" style={{ color: `hsl(${accent})` }}>
                        €{(total / 100).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        €{(perDay / 100).toFixed(2)}/day
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        New expiry: {newDate.toLocaleDateString()}
                      </p>
                    </>
                  );
                })()}
              </div>

              <Button
                onClick={() => handleExtend(opt.days)}
                disabled={loadingDays !== null}
                className="w-full gap-2 text-white border-0 shadow-md"
                style={{
                  background: `linear-gradient(135deg, hsl(${accent}), hsl(${accentAlt}))`,
                  boxShadow: `0 4px 16px hsla(${accent}, 0.25)`,
                }}
              >
                {loadingDays === opt.days ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Extend {opt.label}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
