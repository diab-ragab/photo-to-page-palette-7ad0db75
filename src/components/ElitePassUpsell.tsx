import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Sparkles, Gift, Zap, Star, ChevronRight, Diamond, Gem, ArrowUp, ShieldCheck, Clock, Power } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CardPaymentForm } from "@/components/shop/CardPaymentForm";
import { useNavigate } from "react-router-dom";
import { hapticSuccess } from "@/hooks/useHapticFeedback";
import { OrderPayload } from "@/lib/paypalOrderApi";

interface PassUpsellProps {
  compact?: boolean;
  currentTier?: "free" | "elite" | "gold";
  expiresAt?: string | null;
  elitePriceCents?: number;
  goldPriceCents?: number;
  gamepassEnabled?: boolean;
  eliteEnabled?: boolean;
  goldEnabled?: boolean;
}

export const ElitePassUpsell = ({ compact = false, currentTier = "free", expiresAt, elitePriceCents = 999, goldPriceCents = 1999, gamepassEnabled = true, eliteEnabled = true, goldEnabled = true }: PassUpsellProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchaseTier, setPurchaseTier] = useState<{ tier: "elite" | "gold"; isUpgrade: boolean } | null>(null);

  const elitePriceStr = `€${(elitePriceCents / 100).toFixed(2)}`;
  const goldPriceStr = `€${(goldPriceCents / 100).toFixed(2)}`;

  const gamepassPayload: OrderPayload | undefined = purchaseTier
    ? { type: "gamepass", tier: purchaseTier.tier, upgrade: purchaseTier.isUpgrade }
    : undefined;

  if (!gamepassEnabled) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center">
        <Power className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-bold text-foreground mb-1">Game Pass is Currently Unavailable</h3>
        <p className="text-sm text-muted-foreground">The Game Pass is temporarily disabled. Check back later!</p>
      </div>
    );
  }

  const formatExpiry = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const formatted = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return { formatted, daysLeft };
  };

  const expiry = formatExpiry(expiresAt);

  const handlePurchaseClick = (tier: "elite" | "gold", isUpgrade = false) => {
    if (!user) {
      toast.error("Please log in first to purchase a Game Pass.");
      return;
    }
    setPurchaseTier({ tier, isUpgrade });
  };

  const handlePaymentSuccess = () => {
    hapticSuccess();
    toast.success("🎉 Game Pass purchased!", { description: "Your pass is now active!" });
    setPurchaseTier(null);
    navigate("/payment-success");
  };

  const handlePaymentError = (message: string) => {
    toast.error(message);
  };

  const activeTierPrice = purchaseTier?.tier === "gold" ? goldPriceCents : elitePriceCents;
  const activeTierLabel = purchaseTier?.tier === "gold" ? "Gold Pass" : "Elite Pass";

  // Active tier badge component
  const ActiveBadge = ({ tier }: { tier: string }) => (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400">
          ✓ Active {tier} Pass
        </span>
      </div>
      {expiry && (
        <div className="flex items-center gap-1.5 ml-6">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Expires {expiry.formatted} ({expiry.daysLeft}d left)
          </span>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Elite compact */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 p-4">
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Crown className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-200 text-sm">Elite Pass — {elitePriceStr}</p>
                  {currentTier === "elite" ? (
                    <ActiveBadge tier="Elite" />
                  ) : currentTier === "gold" ? (
                    <span className="text-xs text-emerald-400">✓ Included in Gold</span>
                  ) : (
                    <p className="text-xs text-amber-200/70">Unlock elite rewards!</p>
                  )}
                </div>
              </div>
              {currentTier === "free" && eliteEnabled && (
                <Button
                  onClick={() => handlePurchaseClick("elite")}
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold gap-1"
                >
                  Buy
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {currentTier === "free" && !eliteEnabled && (
                <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">Unavailable</Badge>
              )}
            </div>
          </div>
          {/* Gold compact */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-violet-500/20 border border-violet-500/30 p-4">
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Diamond className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-violet-200 text-sm">
                    Gold Pass — {goldPriceStr}
                  </p>
                  {currentTier === "gold" ? (
                    <ActiveBadge tier="Gold" />
                  ) : currentTier === "elite" ? (
                    <p className="text-xs text-violet-200/70">Upgrade to unlock Gold rewards!</p>
                  ) : (
                    <p className="text-xs text-violet-200/70">Unlock ALL rewards!</p>
                  )}
                </div>
              </div>
              {currentTier !== "gold" && goldEnabled && (
                <Button
                  onClick={() => handlePurchaseClick("gold", currentTier === "elite")}
                  size="sm"
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold gap-1"
                >
                  {currentTier === "elite" ? "Upgrade" : "Buy"}
                  {currentTier === "elite" ? <ArrowUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
              {currentTier !== "gold" && !goldEnabled && (
                <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">Unavailable</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Payment Dialog */}
        <Dialog open={!!purchaseTier} onOpenChange={(open) => !open && setPurchaseTier(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Purchase {activeTierLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-lg p-4 flex justify-between items-center">
                <span className="font-medium">{activeTierLabel}</span>
                <span className="text-primary font-bold">€{(activeTierPrice / 100).toFixed(2)}</span>
              </div>
              <CardPaymentForm
                orderPayload={gamepassPayload}
                totalPrice={activeTierPrice / 100}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Elite Pass Card */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 via-yellow-900/20 to-amber-900/40 border ${currentTier === "elite" ? "border-emerald-500/50" : "border-amber-500/30"}`}>
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-amber-400/30 animate-pulse"
                style={{
                  top: `${20 + i * 20}%`,
                  left: `${10 + i * 20}%`,
                  animationDelay: `${i * 0.3}s`,
                  width: 12 + (i % 3) * 4,
                  height: 12 + (i % 3) * 4,
                }}
              />
            ))}
          </div>
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-lg shadow-amber-500/30">
                <Crown className="h-7 w-7 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
                    Elite Pass
                  </h3>
                  {currentTier === "elite" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                      <ShieldCheck className="h-3 w-3 mr-0.5" /> ACTIVE
                    </Badge>
                  )}
                  {currentTier === "gold" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                      ✓ INCLUDED
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-amber-200/70">Premium tier</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                <Gift className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-100">5M Zen Monthly</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-100">Exclusive Items</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-100">Legendary Gear</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-amber-100">Bonus Spins</span>
              </div>
            </div>

            {currentTier === "elite" ? (
              <div className="w-full flex flex-col items-center justify-center gap-1 py-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span className="font-bold text-emerald-400">Active Elite Pass</span>
                </div>
                {expiry && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Expires {expiry.formatted} ({expiry.daysLeft}d left)</span>
                  </div>
                )}
              </div>
            ) : currentTier === "gold" ? (
              <div className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-emerald-400">Included in Gold</span>
              </div>
            ) : !eliteEnabled ? (
              <div className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-destructive/10 border border-destructive/30">
                <Power className="h-5 w-5 text-destructive" />
                <span className="font-bold text-destructive text-sm">Elite Pass Unavailable</span>
              </div>
            ) : (
              <Button
                onClick={() => handlePurchaseClick("elite")}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold h-11 text-base shadow-lg shadow-amber-500/30"
              >
                <Crown className="h-5 w-5 mr-2" />
                {`Buy Elite — ${elitePriceStr}`}
              </Button>
            )}
            <p className="text-center text-xs text-amber-200/50 mt-3">
              One-time purchase • 30-day access
            </p>
          </div>
        </div>

        {/* Gold Pass Card */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/40 via-fuchsia-900/20 to-violet-900/40 border ${currentTier === "gold" ? "border-emerald-500/50" : "border-violet-500/30"}`}>
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-violet-400/30 animate-pulse"
                style={{
                  top: `${20 + i * 20}%`,
                  left: `${10 + i * 20}%`,
                  animationDelay: `${i * 0.3}s`,
                  width: 12 + (i % 3) * 4,
                  height: 12 + (i % 3) * 4,
                }}
              />
            ))}
          </div>
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/30">
                <Diamond className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-violet-200 to-fuchsia-100 bg-clip-text text-transparent">
                    Gold Pass
                  </h3>
                  {currentTier === "gold" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                      <ShieldCheck className="h-3 w-3 mr-0.5" /> ACTIVE
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-violet-200/70">Ultimate tier</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2 p-2 bg-violet-500/10 rounded-lg">
                <Gift className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-violet-100">All Elite Rewards</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-violet-500/10 rounded-lg">
                <Gem className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-violet-100">9M Zen Monthly</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-violet-500/10 rounded-lg">
                <Diamond className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-violet-100">Mythic Gear</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-violet-500/10 rounded-lg">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-violet-100">Max Bonus Spins</span>
              </div>
            </div>

            {currentTier === "gold" ? (
              <div className="w-full flex flex-col items-center justify-center gap-1 py-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span className="font-bold text-emerald-400">Active Gold Pass</span>
                </div>
                {expiry && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Expires {expiry.formatted} ({expiry.daysLeft}d left)</span>
                  </div>
                )}
              </div>
            ) : !goldEnabled ? (
              <div className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-destructive/10 border border-destructive/30">
                <Power className="h-5 w-5 text-destructive" />
                <span className="font-bold text-destructive text-sm">Gold Pass Unavailable</span>
              </div>
            ) : currentTier === "elite" ? (
              <Button
                onClick={() => handlePurchaseClick("gold", true)}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold h-11 text-base shadow-lg shadow-violet-500/30"
              >
                <ArrowUp className="h-5 w-5 mr-2" />
                {`Upgrade to Gold — ${goldPriceStr}`}
              </Button>
            ) : (
              <Button
                onClick={() => handlePurchaseClick("gold")}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold h-11 text-base shadow-lg shadow-violet-500/30"
              >
                <Diamond className="h-5 w-5 mr-2" />
                {`Buy Gold — ${goldPriceStr}`}
              </Button>
            )}
            <p className="text-center text-xs text-violet-200/50 mt-3">
              One-time purchase • 30-day access
            </p>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!purchaseTier} onOpenChange={(open) => !open && setPurchaseTier(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase {activeTierLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-secondary/30 rounded-lg p-4 flex justify-between items-center">
              <span className="font-medium">{activeTierLabel}</span>
              <span className="text-primary font-bold">€{(activeTierPrice / 100).toFixed(2)}</span>
            </div>
            <CardPaymentForm
              orderPayload={gamepassPayload}
              totalPrice={activeTierPrice / 100}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
