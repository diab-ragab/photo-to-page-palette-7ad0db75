import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Gift, Zap, Star, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ElitePassUpsellProps {
  compact?: boolean;
  onUpgrade?: () => void;
}

export const ElitePassUpsell = ({ compact = false, onUpgrade }: ElitePassUpsellProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate("/shop?category=elite-pass");
    }
  };

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iMC4wNSIgY3g9IjIwIiBjeT0iMjAiIHI9IjEiLz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Crown className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-200 text-sm">Upgrade to Elite Pass</p>
              <p className="text-xs text-amber-200/70">Unlock exclusive rewards!</p>
            </div>
          </div>
          
          <Button 
            onClick={handleUpgrade}
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold gap-1"
          >
            Upgrade
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 via-yellow-900/20 to-amber-900/40 border border-amber-500/30">
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-amber-400/30 animate-pulse"
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 15}%`,
              animationDelay: `${i * 0.3}s`,
              width: 12 + (i % 3) * 4,
              height: 12 + (i % 3) * 4,
            }}
          />
        ))}
      </div>
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-lg shadow-amber-500/30">
            <Crown className="h-7 w-7 text-black" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
              Elite Pass
            </h3>
            <p className="text-sm text-amber-200/70">Unlock premium rewards</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
            <Gift className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-amber-100">2x Daily Rewards</span>
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
            <span className="text-xs text-amber-100">Bonus Zen</span>
          </div>
        </div>

        {/* CTA */}
        <Button 
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold h-11 text-base shadow-lg shadow-amber-500/30"
        >
          <Crown className="h-5 w-5 mr-2" />
          Upgrade Now - €9.99/month
        </Button>
        
        <p className="text-center text-xs text-amber-200/50 mt-3">
          Cancel anytime • Instant activation
        </p>
      </div>
    </div>
  );
};
