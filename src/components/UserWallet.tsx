import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Crown, Gem, Wallet, Sparkles } from "lucide-react";

interface WalletCurrency {
  name: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
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
      icon: <Coins className="h-4 w-4" />,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      name: "VIP Points",
      amount: vipPoints,
      icon: <Crown className="h-4 w-4" />,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      name: "Zen",
      amount: zen,
      icon: <Gem className="h-4 w-4" />,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      name: "Premium",
      amount: premiumCoins,
      icon: <Sparkles className="h-4 w-4" />,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    }
  ];

  const visibleCurrencies = currencies.filter((c, i) => i < 2 || c.amount > 0);

  return (
    <Card className="bg-card border-primary/20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
      <CardHeader className="relative py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          My Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="relative px-4 pb-3 pt-0 space-y-1.5">
        {visibleCurrencies.map((currency) => (
          <div
            key={currency.name}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${currency.bgColor} ${currency.color}`}>
                {currency.icon}
              </div>
              <span className="font-medium text-xs">{currency.name}</span>
            </div>
            <span className={`text-sm font-bold ${currency.color}`}>
              {currency.amount >= 1000000
                ? `${(currency.amount / 1000000).toFixed(1)}M`
                : currency.amount >= 1000
                  ? `${(currency.amount / 1000).toFixed(0)}k`
                  : currency.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
