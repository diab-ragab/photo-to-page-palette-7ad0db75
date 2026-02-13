import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gem, Coins, Check, Crown, Sparkles, Loader2 } from "lucide-react";
import { SkeletonGrid, ApiEmptyState, ApiErrorState } from "@/components/ui/api-loading-state";
import { toast } from "sonner";
import { hapticSuccess } from "@/hooks/useHapticFeedback";
import { fetchActivePackages, TopUpPackage } from "@/lib/currencyTopupApi";
import { CharacterSelector } from "@/components/shop/CharacterSelector";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/apiFetch";

type CurrencyType = "zen" | "coins";

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

interface PackageCardProps {
  pkg: TopUpPackage;
  currencyType: CurrencyType;
  selected: boolean;
  onSelect: () => void;
}

const PackageCard = ({ pkg, currencyType, selected, onSelect }: PackageCardProps) => {
  const Icon = currencyType === "zen" ? Gem : Coins;
  const totalAmount = pkg.amount + pkg.bonus_amount;
  const bonusPercent = pkg.bonus_amount > 0 ? Math.round((pkg.bonus_amount / pkg.amount) * 100) : 0;

  return (
    <Card 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
        selected 
          ? "border-2 border-primary shadow-lg shadow-primary/20" 
          : "border-border hover:border-primary/50"
      } ${pkg.is_popular ? "ring-1 ring-primary/30" : ""}`}
    >
      {pkg.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground font-bold">
            <Crown className="h-3 w-3 mr-1" />
            POPULAR
          </Badge>
        </div>
      )}
      
      {pkg.is_best_value && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-green-500 text-white font-bold">
            <Sparkles className="h-3 w-3 mr-1" />
            BEST VALUE
          </Badge>
        </div>
      )}
      
      <CardContent className="p-4 text-center">
        {/* Icon & Amount */}
        <div className="mb-3">
          <Icon className={`h-8 w-8 mx-auto mb-2 ${currencyType === "zen" ? "text-purple-400" : "text-yellow-400"}`} />
          <div className="text-2xl font-bold">{formatNumber(pkg.amount)}</div>
          {pkg.bonus_amount > 0 && (
            <div className="text-sm text-green-400 font-medium">
              +{formatNumber(pkg.bonus_amount)} bonus ({bonusPercent}%)
            </div>
          )}
        </div>

        {/* Total */}
        <div className="text-xs text-muted-foreground mb-3">
          Total: {formatNumber(totalAmount)} {currencyType === "zen" ? "Zen" : "Coins"}
        </div>

        {/* Price */}
        <div className="text-xl font-bold text-primary mb-2">
          €{pkg.price.toFixed(2)}
        </div>

        {/* Selection indicator */}
        {selected && (
          <div className="absolute top-2 right-2 p-1 bg-primary rounded-full">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const CurrencyTopUp = () => {
  const [currencyType, setCurrencyType] = useState<CurrencyType>("zen");
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [packages, setPackages] = useState<TopUpPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();

  // Fetch packages from database
  const loadPackages = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchActivePackages();
      setPackages(data);
    } catch (err) {
      console.error("Failed to load currency packages:", err);
      setPackages([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  // Filter packages by currency type
  const filteredPackages = packages.filter(pkg => pkg.currency_type === currencyType);

  const handleCharacterSelect = (roleId: number | null, characterName: string | null) => {
    setSelectedRoleId(roleId);
    setSelectedCharacterName(characterName);
  };

  const handlePurchase = async () => {
    if (!isLoggedIn) {
      toast.error("Please login to purchase currency");
      return;
    }

    if (!selectedPackage) {
      toast.error("Please select a package");
      return;
    }

    if (!selectedRoleId) {
      toast.error("Please select a character to receive the currency");
      return;
    }

    const pkg = filteredPackages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    setPurchasing(true);

    try {
      const data = await apiPost<any>(
        `/currency_topup.php?action=purchase`,
        {
          package_id: pkg.id,
          character_id: selectedRoleId,
          character_name: selectedCharacterName,
        },
        true,
        { showErrorToast: false, retries: 1 }
      );

      if (data.success && data.url) {
        hapticSuccess();
        toast.success("Redirecting to PayPal...");
        window.location.href = data.url;
      } else {
        toast.error(data.message || "Failed to initialize payment");
      }
    } catch (err: any) {
      console.error("Top-up purchase error:", err);
      toast.error(err?.serverMessage || err?.message || "Failed to connect to payment service");
    } finally {
      setPurchasing(false);
    }
  };

  // Reset selection when switching currency type
  const handleCurrencyChange = (type: CurrencyType) => {
    setCurrencyType(type);
    setSelectedPackage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with currency toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Gem className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Top Up Currency</h2>
            <p className="text-sm text-muted-foreground">Instant delivery to your character</p>
          </div>
        </div>

        {/* Currency Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => handleCurrencyChange("zen")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currencyType === "zen" 
                ? "bg-background text-foreground shadow" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Gem className="h-4 w-4 text-purple-400" />
            Zen
          </button>
          <button
            onClick={() => handleCurrencyChange("coins")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currencyType === "coins" 
                ? "bg-background text-foreground shadow" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coins className="h-4 w-4 text-yellow-400" />
            Coins
          </button>
        </div>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <SkeletonGrid count={6} gridCols="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" itemHeight="h-40" />
      ) : error ? (
        <ApiErrorState message="Failed to load currency packages." onRetry={loadPackages} />
      ) : filteredPackages.length === 0 ? (
        <ApiEmptyState
          icon={<Gem className="h-12 w-12" />}
          title="No packages available"
          description={`Check back later for ${currencyType === "zen" ? "Zen" : "Coins"} packages.`}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              currencyType={currencyType}
              selected={selectedPackage === pkg.id}
              onSelect={() => setSelectedPackage(pkg.id)}
            />
          ))}
        </div>
      )}

      {/* Character selector & Purchase */}
      {filteredPackages.length > 0 && (
        <div className="max-w-md mx-auto space-y-4">
          <CharacterSelector
            onSelect={handleCharacterSelect}
            selectedRoleId={selectedRoleId}
          />

          <Button 
            onClick={handlePurchase}
            disabled={!selectedPackage || !selectedRoleId || loading || purchasing}
            size="lg"
            className="w-full gap-2"
          >
            {purchasing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Redirecting to PayPal...
              </>
            ) : currencyType === "zen" ? (
              <>
                <Gem className="h-5 w-5" />
                Purchase Zen via PayPal
              </>
            ) : (
              <>
                <Coins className="h-5 w-5" />
                Purchase Coins via PayPal
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info */}
      <p className="text-center text-xs text-muted-foreground">
        All purchases are delivered via in-game mail to your selected character.
      </p>
    </div>
  );
};