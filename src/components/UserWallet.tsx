import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Crown, Gem, Wallet, Sparkles } from "lucide-react";

interface WalletCurrency {
  name: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description?: string;
}

interface UserWalletProps {
  coins: number;
  vipPoints: number;
  zen?: number;
  premiumCoins?: number;
}

export const UserWallet = ({ coins, vipPoints, zen = 0, premiumCoins = 0 }: UserWalletProps) => {
  const currencies: WalletCurrency[] = [
    {
      name: "Vote Coins",
      amount: coins,
      icon: <Coins className="h-5 w-5" />,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      description: "Earned from voting"
    },
    {
      name: "VIP Points",
      amount: vipPoints,
      icon: <Crown className="h-5 w-5" />,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      description: "Unlock VIP benefits"
    },
    {
      name: "Zen",
      amount: zen,
      icon: <Gem className="h-5 w-5" />,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      description: "Premium currency"
    },
    {
      name: "Premium Coins",
      amount: premiumCoins,
      icon: <Sparkles className="h-5 w-5" />,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      description: "Shop purchases"
    }
  ];

  // Filter out currencies with 0 balance (except Coins and VIP which are always shown)
  const visibleCurrencies = currencies.filter((c, i) => i < 2 || c.amount > 0);

  return (
    <Card className="bg-card border-primary/20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          My Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-3">
        {visibleCurrencies.map((currency, index) => (
          <div
            key={currency.name}
            className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currency.bgColor} ${currency.color} transition-transform duration-300 group-hover:scale-110`}>
                {currency.icon}
              </div>
              <div>
                <div className="font-medium text-sm">{currency.name}</div>
                {currency.description && (
                  <div className="text-xs text-muted-foreground">{currency.description}</div>
                )}
              </div>
            </div>
            <div className={`text-lg font-bold ${currency.color}`}>
              {currency.amount.toLocaleString()}
            </div>
          </div>
        ))}

        {/* Total Value Indicator */}
        <div className="pt-3 mt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Currencies</span>
            <span className="font-medium text-foreground">{visibleCurrencies.length} active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
