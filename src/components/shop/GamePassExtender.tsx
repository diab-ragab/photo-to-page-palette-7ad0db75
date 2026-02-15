import { useState } from "react";
import { CalendarPlus, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CardPaymentForm } from "@/components/shop/CardPaymentForm";
import { useNavigate } from "react-router-dom";
import { hapticSuccess } from "@/hooks/useHapticFeedback";
import { motion } from "framer-motion";
import type { OrderPayload } from "@/lib/paypalOrderApi";

interface GamePassExtenderProps {
  currentTier: string;
  expiresAt: string | null;
  elitePerDayCents?: number;
  goldPerDayCents?: number;
}

const DAY_OPTIONS = [30, 60, 90];

export const GamePassExtender = ({
  currentTier,
  expiresAt,
  elitePerDayCents = 34,
  goldPerDayCents = 67,
}: GamePassExtenderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState(30);
  const [showPayment, setShowPayment] = useState(false);

  // Only show for elite/gold users
  if (currentTier !== "elite" && currentTier !== "gold") return null;

  const perDayCents = currentTier === "gold" ? goldPerDayCents : elitePerDayCents;
  const totalCents = Math.max(50, perDayCents * selectedDays);
  const totalEur = (totalCents / 100).toFixed(2);

  const expiry = expiresAt ? new Date(expiresAt) : null;
  const now = new Date();
  const isActive = expiry ? expiry.getTime() > now.getTime() : false;
  const daysLeft = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / 86400000)) : 0;

  const newExpiry = new Date(
    isActive && expiry ? expiry.getTime() + selectedDays * 86400000 : now.getTime() + selectedDays * 86400000
  );

  const tierColor = currentTier === "gold" ? "violet" : "amber";

  const payload: OrderPayload = {
    type: "gamepass_extend" as any,
    tier: currentTier as "elite" | "gold",
    days: selectedDays,
  };

  const handleExtend = () => {
    if (!user) {
      toast.error("Please log in first.");
      return;
    }
    setShowPayment(true);
  };

  const handleSuccess = () => {
    hapticSuccess();
    toast.success(`🎉 Pass extended by ${selectedDays} days!`, {
      description: `New expiry: ${newExpiry.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
    });
    setShowPayment(false);
    navigate("/payment-success");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className={`rounded-2xl border border-${tierColor}-500/30 overflow-hidden`}
        style={{
          background:
            currentTier === "gold"
              ? "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(217,70,239,0.04) 50%, rgba(139,92,246,0.08) 100%)"
              : "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,179,8,0.04) 50%, rgba(245,158,11,0.08) 100%)",
        }}
      >
        <div className="p-5 md:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-2.5 rounded-xl ${
                currentTier === "gold"
                  ? "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10"
                  : "bg-gradient-to-br from-amber-500/20 to-yellow-500/10"
              }`}
            >
              <CalendarPlus
                className={`h-5 w-5 ${currentTier === "gold" ? "text-violet-400" : "text-amber-400"}`}
              />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                Extend Your {currentTier === "gold" ? "Gold" : "Elite"} Pass
              </h3>
              <p className="text-xs text-muted-foreground">
                Stack more days onto your current pass
              </p>
            </div>
            {isActive && (
              <Badge
                variant="outline"
                className={`ml-auto text-[10px] ${
                  currentTier === "gold"
                    ? "border-violet-500/40 text-violet-400"
                    : "border-amber-500/40 text-amber-400"
                }`}
              >
                <Timer className="h-3 w-3 mr-1" />
                {daysLeft}d left
              </Badge>
            )}
          </div>

          {/* Day selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDays(d)}
                className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
                  selectedDays === d
                    ? currentTier === "gold"
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                      : "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Price summary */}
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4 mb-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Price per day</span>
              <span>€{(perDayCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Days to add</span>
              <span>+{selectedDays} days</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between items-center">
              <span className="text-sm font-bold text-foreground">Total</span>
              <span
                className={`text-lg font-extrabold ${
                  currentTier === "gold" ? "text-violet-400" : "text-amber-400"
                }`}
              >
                €{totalEur}
              </span>
            </div>
            {isActive && expiry && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                <Sparkles className="h-3 w-3" />
                <span>
                  New expiry:{" "}
                  <strong className="text-foreground">
                    {newExpiry.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>{" "}
                  ({daysLeft + selectedDays} total days)
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          <Button
            onClick={handleExtend}
            className={`w-full font-bold h-11 ${
              currentTier === "gold"
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/30"
                : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black shadow-lg shadow-amber-500/30"
            }`}
          >
            <CalendarPlus className="h-5 w-5 mr-2" />
            Extend by {selectedDays} Days — €{totalEur}
          </Button>
        </div>
      </motion.div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={(open) => !open && setShowPayment(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Extend {currentTier === "gold" ? "Gold" : "Elite"} Pass
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  +{selectedDays} days extension
                </span>
                <span className="text-primary font-bold">€{totalEur}</span>
              </div>
              {isActive && expiry && (
                <p className="text-xs text-muted-foreground">
                  New expiry:{" "}
                  {newExpiry.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <CardPaymentForm
              orderPayload={payload}
              totalPrice={totalCents / 100}
              onSuccess={handleSuccess}
              onError={(msg) => toast.error(msg)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
