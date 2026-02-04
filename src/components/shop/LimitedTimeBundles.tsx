import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Percent, ShoppingCart, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

interface Bundle {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  items: { name: string; quantity: number; icon: string }[];
  endsAt: Date;
  featured?: boolean;
  stock?: number;
}

// Mock bundles - in production, fetch from API
const MOCK_BUNDLES: Bundle[] = [
  {
    id: "flash-starter",
    name: "Starter Pack",
    description: "Perfect for new adventurers",
    originalPrice: 19.99,
    salePrice: 9.99,
    discount: 50,
    items: [
      { name: "500K Zen", quantity: 1, icon: "💎" },
      { name: "Rare Weapon Box", quantity: 3, icon: "🗡️" },
      { name: "XP Boost (24h)", quantity: 1, icon: "⚡" },
    ],
    endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    featured: true,
    stock: 23,
  },
  {
    id: "flash-warrior",
    name: "Warrior Bundle",
    description: "For battle-ready heroes",
    originalPrice: 49.99,
    salePrice: 29.99,
    discount: 40,
    items: [
      { name: "2M Zen", quantity: 1, icon: "💎" },
      { name: "Epic Armor Set", quantity: 1, icon: "🛡️" },
      { name: "Legendary Weapon", quantity: 1, icon: "⚔️" },
      { name: "Mount Token", quantity: 1, icon: "🐴" },
    ],
    endsAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
    stock: 15,
  },
  {
    id: "flash-premium",
    name: "Premium Collection",
    description: "Ultimate value pack",
    originalPrice: 99.99,
    salePrice: 49.99,
    discount: 50,
    items: [
      { name: "10M Zen", quantity: 1, icon: "💎" },
      { name: "Legendary Set", quantity: 1, icon: "👑" },
      { name: "Exclusive Pet", quantity: 1, icon: "🐉" },
      { name: "VIP 30 Days", quantity: 1, icon: "⭐" },
      { name: "Costume Box", quantity: 3, icon: "👔" },
    ],
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
];

const formatTime = (ms: number): string => {
  if (ms <= 0) return "00:00:00";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const BundleCard = ({ bundle }: { bundle: Bundle }) => {
  const [timeLeft, setTimeLeft] = useState<number>(bundle.endsAt.getTime() - Date.now());
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(bundle.endsAt.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [bundle.endsAt]);

  const handleBuy = () => {
    // In production, this would go to checkout
    toast({
      title: "Added to Cart! 🛒",
      description: `${bundle.name} has been added to your cart.`,
    });
  };

  const isExpired = timeLeft <= 0;
  const isUrgent = timeLeft < 60 * 60 * 1000; // Less than 1 hour

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
        bundle.featured 
          ? "border-2 border-primary shadow-lg shadow-primary/20" 
          : "border-border"
      } ${isExpired ? "opacity-50" : ""}`}
    >
      {bundle.featured && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
          <Flame className="inline h-3 w-3 mr-1" />
          HOT DEAL
        </div>
      )}
      
      {bundle.stock && bundle.stock < 30 && (
        <div className="absolute top-0 left-0 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-br-lg">
          Only {bundle.stock} left!
        </div>
      )}
      
      <CardContent className="p-5">
        {/* Timer */}
        <div className={`flex items-center gap-2 mb-3 ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
          <Clock className={`h-4 w-4 ${isUrgent ? "animate-pulse" : ""}`} />
          <span className="text-sm font-mono font-medium">
            {isExpired ? "Expired" : formatTime(timeLeft)}
          </span>
          {isUrgent && !isExpired && (
            <Badge variant="destructive" className="text-xs">Ending soon!</Badge>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="font-bold text-lg mb-1">{bundle.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{bundle.description}</p>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {bundle.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span>{item.icon}</span>
              <span>{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-primary">€{bundle.salePrice.toFixed(2)}</span>
          <span className="text-lg text-muted-foreground line-through">€{bundle.originalPrice.toFixed(2)}</span>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Percent className="h-3 w-3 mr-1" />
            {bundle.discount}% OFF
          </Badge>
        </div>

        {/* CTA */}
        <Button 
          onClick={handleBuy}
          disabled={isExpired}
          className="w-full gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {isExpired ? "Sale Ended" : "Buy Now"}
        </Button>
      </CardContent>
    </Card>
  );
};

export const LimitedTimeBundles = () => {
  const [bundles] = useState<Bundle[]>(MOCK_BUNDLES);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-destructive/20 rounded-lg">
          <Sparkles className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Flash Sales</h2>
          <p className="text-sm text-muted-foreground">Limited-time offers - Don't miss out!</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bundles.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} />
        ))}
      </div>
    </div>
  );
};
