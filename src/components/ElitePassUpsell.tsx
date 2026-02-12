import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Gift, Zap, Star, ChevronRight, Diamond, Gem, ArrowUp, ShieldCheck } from "lucide-react";
import { apiPost } from "@/lib/apiFetch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PassUpsellProps {
  compact?: boolean;
  currentTier?: "free" | "elite" | "gold";
}

export const ElitePassUpsell = ({ compact = false, currentTier = "free" }: PassUpsellProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (tier: "elite" | "gold", isUpgrade = false) => {
    if (!user) {
      toast.error("Please log in first to purchase a Game Pass.");
      return;
    }
    setLoading(tier);
    try {
      const token = localStorage.getItem("woi_session_token") || localStorage.getItem("sessionToken") || "";
      const data = await apiPost<any>(
        `/gamepass_purchase.php?sessionToken=${encodeURIComponent(token)}`,
        { tier, sessionToken: token, upgrade: isUpgrade },
        true,
        { showErrorToast: false }
      );
      if (data?.success && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.error || "Failed to start purchase");
      }
    } catch (err: any) {
      toast.error(err?.serverMessage || "Failed to start purchase. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  // Active tier badge component
  const ActiveBadge = ({ tier }: { tier: string }) => (
    <div className="flex items-center gap-2 py-2">
      <ShieldCheck className="h-4 w-4 text-emerald-400" />
      <span className="text-xs font-semibold text-emerald-400">
        ✓ You have an active {tier} Pass
      </span>
    </div>
  );

  if (compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Elite compact */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 p-4">
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-amber-200 text-sm">Elite Pass — €9.99</p>
                {currentTier === "elite" ? (
                  <ActiveBadge tier="Elite" />
                ) : currentTier === "gold" ? (
                  <span className="text-xs text-emerald-400">✓ Included in Gold</span>
                ) : (
                  <p className="text-xs text-amber-200/70">Unlock elite rewards!</p>
                )}
              </div>
            </div>
            {currentTier === "free" && (
              <Button
                onClick={() => handlePurchase("elite")}
                size="sm"
                disabled={loading === "elite"}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold gap-1"
              >
                {loading === "elite" ? "..." : "Buy"}
                <ChevronRight className="h-4 w-4" />
              </Button>
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
                  Gold Pass — {currentTier === "elite" ? "€10.00 upgrade" : "€19.99"}
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
            {currentTier !== "gold" && (
              <Button
                onClick={() => handlePurchase("gold", currentTier === "elite")}
                size="sm"
                disabled={loading === "gold"}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold gap-1"
              >
                {loading === "gold" ? "..." : currentTier === "elite" ? "Upgrade" : "Buy"}
                {currentTier === "elite" ? <ArrowUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
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
            <div className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-emerald-500/10 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="font-bold text-emerald-400">Active Elite Pass</span>
            </div>
          ) : currentTier === "gold" ? (
            <div className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-emerald-500/10 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="font-bold text-emerald-400">Included in Gold</span>
            </div>
          ) : (
            <Button
              onClick={() => handlePurchase("elite")}
              disabled={loading === "elite"}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold h-11 text-base shadow-lg shadow-amber-500/30"
            >
              <Crown className="h-5 w-5 mr-2" />
              {loading === "elite" ? "Processing..." : "Buy Elite — €9.99"}
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
            <div className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-emerald-500/10 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="font-bold text-emerald-400">Active Gold Pass</span>
            </div>
          ) : currentTier === "elite" ? (
            <Button
              onClick={() => handlePurchase("gold", true)}
              disabled={loading === "gold"}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold h-11 text-base shadow-lg shadow-violet-500/30"
            >
              <ArrowUp className="h-5 w-5 mr-2" />
              {loading === "gold" ? "Processing..." : "Upgrade to Gold — €10.00"}
            </Button>
          ) : (
            <Button
              onClick={() => handlePurchase("gold")}
              disabled={loading === "gold"}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold h-11 text-base shadow-lg shadow-violet-500/30"
            >
              <Diamond className="h-5 w-5 mr-2" />
              {loading === "gold" ? "Processing..." : "Buy Gold — €19.99"}
            </Button>
          )}
          <p className="text-center text-xs text-violet-200/50 mt-3">
            {currentTier === "elite" ? "Upgrade price • Pay the difference" : "One-time purchase • 30-day access"}
          </p>
        </div>
      </div>
    </div>
  );
};
