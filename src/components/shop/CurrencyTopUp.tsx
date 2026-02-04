import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gem, Coins, Check, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CurrencyType = "zen" | "coins";

interface TopUpPackage {
  id: string;
  amount: number;
  bonusAmount: number;
  price: number;
  popular?: boolean;
  bestValue?: boolean;
}

const ZEN_PACKAGES: TopUpPackage[] = [
  { id: "zen-1", amount: 100000, bonusAmount: 0, price: 0.99 },
  { id: "zen-2", amount: 500000, bonusAmount: 50000, price: 4.99 },
  { id: "zen-3", amount: 1000000, bonusAmount: 150000, price: 9.99, popular: true },
  { id: "zen-4", amount: 3000000, bonusAmount: 600000, price: 24.99 },
  { id: "zen-5", amount: 5000000, bonusAmount: 1250000, price: 39.99, bestValue: true },
  { id: "zen-6", amount: 10000000, bonusAmount: 3000000, price: 74.99 },
];

const COINS_PACKAGES: TopUpPackage[] = [
  { id: "coins-1", amount: 100, bonusAmount: 0, price: 0.99 },
  { id: "coins-2", amount: 500, bonusAmount: 50, price: 4.99 },
  { id: "coins-3", amount: 1000, bonusAmount: 150, price: 9.99, popular: true },
  { id: "coins-4", amount: 3000, bonusAmount: 500, price: 24.99 },
  { id: "coins-5", amount: 5000, bonusAmount: 1000, price: 39.99, bestValue: true },
  { id: "coins-6", amount: 10000, bonusAmount: 2500, price: 74.99 },
];

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
  const totalAmount = pkg.amount + pkg.bonusAmount;
  const bonusPercent = pkg.bonusAmount > 0 ? Math.round((pkg.bonusAmount / pkg.amount) * 100) : 0;

  return (
    <Card 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
        selected 
          ? "border-2 border-primary shadow-lg shadow-primary/20" 
          : "border-border hover:border-primary/50"
      } ${pkg.popular ? "ring-1 ring-primary/30" : ""}`}
    >
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground font-bold">
            <Crown className="h-3 w-3 mr-1" />
            POPULAR
          </Badge>
        </div>
      )}
      
      {pkg.bestValue && (
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
          {pkg.bonusAmount > 0 && (
            <div className="text-sm text-green-400 font-medium">
              +{formatNumber(pkg.bonusAmount)} bonus ({bonusPercent}%)
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
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { toast } = useToast();

  const packages = currencyType === "zen" ? ZEN_PACKAGES : COINS_PACKAGES;

  const handlePurchase = () => {
    if (!selectedPackage) {
      toast({
        title: "Select a package",
        description: "Please select a package to continue.",
        variant: "destructive",
      });
      return;
    }

    const pkg = packages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    // In production, redirect to checkout
    toast({
      title: "Redirecting to checkout... 💳",
      description: `${formatNumber(pkg.amount + pkg.bonusAmount)} ${currencyType === "zen" ? "Zen" : "Coins"} for €${pkg.price.toFixed(2)}`,
    });
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
            <p className="text-sm text-muted-foreground">Instant delivery to your account</p>
          </div>
        </div>

        {/* Currency Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => { setCurrencyType("zen"); setSelectedPackage(null); }}
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
            onClick={() => { setCurrencyType("coins"); setSelectedPackage(null); }}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            currencyType={currencyType}
            selected={selectedPackage === pkg.id}
            onSelect={() => setSelectedPackage(pkg.id)}
          />
        ))}
      </div>

      {/* Purchase Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handlePurchase}
          disabled={!selectedPackage}
          size="lg"
          className="px-8 gap-2"
        >
          {currencyType === "zen" ? <Gem className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
          Purchase {currencyType === "zen" ? "Zen" : "Coins"}
        </Button>
      </div>

      {/* Info */}
      <p className="text-center text-xs text-muted-foreground">
        All purchases are instant. Currency is added directly to your account.
      </p>
    </div>
  );
};
