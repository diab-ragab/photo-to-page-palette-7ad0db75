import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Flame, Percent, ShoppingCart, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bundlesApi, Bundle, getIconEmoji } from "@/lib/bundlesApi";

const formatTime = (ms: number): string => {
  if (ms <= 0) return "00:00:00";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

interface BundleCardProps {
  bundle: Bundle;
  serverTimeOffset: number;
}

const BundleCard = ({ bundle, serverTimeOffset }: BundleCardProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    // Calculate end time using server time offset for accuracy
    const endTime = bundle.ends_at_ts ? bundle.ends_at_ts * 1000 : new Date(bundle.ends_at).getTime();
    
    const updateTimer = () => {
      // Adjust local time with server offset
      const now = Date.now() + serverTimeOffset;
      setTimeLeft(Math.max(0, endTime - now));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [bundle.ends_at, bundle.ends_at_ts, serverTimeOffset]);

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
        bundle.is_featured 
          ? "border-2 border-primary shadow-lg shadow-primary/20" 
          : "border-border"
      } ${isExpired ? "opacity-50" : ""}`}
    >
      {bundle.is_featured && (
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
          {bundle.items?.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span>{item.icon_emoji || getIconEmoji(item.icon)}</span>
              <span>{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.item_name}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-primary">€{Number(bundle.sale_price).toFixed(2)}</span>
          <span className="text-lg text-muted-foreground line-through">€{Number(bundle.original_price).toFixed(2)}</span>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Percent className="h-3 w-3 mr-1" />
            {bundle.discount_percent}% OFF
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
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const { bundles: data, server_time } = await bundlesApi.getActive();
        setBundles(data);
        
        // Calculate server time offset (server_time - local_time in ms)
        if (server_time) {
          const localNow = Math.floor(Date.now() / 1000);
          setServerTimeOffset((server_time - localNow) * 1000);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBundles();
    
    // Refresh bundles every 5 minutes
    const interval = setInterval(fetchBundles, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load flash sales</span>
      </div>
    );
  }

  if (bundles.length === 0) {
    return null; // Don't show section if no active bundles
  }

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
          <BundleCard 
            key={bundle.id} 
            bundle={bundle} 
            serverTimeOffset={serverTimeOffset}
          />
        ))}
      </div>
    </div>
  );
};
