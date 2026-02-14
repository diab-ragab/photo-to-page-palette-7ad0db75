import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Flame, Percent, ShoppingCart, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { hapticSuccess } from "@/hooks/useHapticFeedback";
import { bundlesApi, Bundle, getIconEmoji } from "@/lib/bundlesApi";
import { CharacterSelector } from "@/components/shop/CharacterSelector";
import { CardPaymentForm } from "@/components/shop/CardPaymentForm";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { OrderPayload } from "@/lib/paypalOrderApi";

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
  onBuy: (bundle: Bundle) => void;
}

const BundleCard = ({ bundle, serverTimeOffset, onBuy }: BundleCardProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const endTime = bundle.ends_at_ts ? bundle.ends_at_ts * 1000 : new Date(bundle.ends_at).getTime();
    
    const updateTimer = () => {
      const now = Date.now() + serverTimeOffset;
      setTimeLeft(Math.max(0, endTime - now));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [bundle.ends_at, bundle.ends_at_ts, serverTimeOffset]);

  const isExpired = timeLeft <= 0;
  const isUrgent = timeLeft < 60 * 60 * 1000;
  const isSoldOut = bundle.stock !== null && bundle.stock <= 0;

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
        bundle.is_featured 
          ? "border-2 border-primary shadow-lg shadow-primary/20" 
          : "border-border"
      } ${isExpired || isSoldOut ? "opacity-50" : ""}`}
    >
      {bundle.is_featured && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
          <Flame className="inline h-3 w-3 mr-1" />
          HOT DEAL
        </div>
      )}
      
      {bundle.stock !== null && bundle.stock > 0 && bundle.stock < 30 && (
        <div className="absolute top-0 left-0 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-br-lg">
          Only {bundle.stock} left!
        </div>
      )}
      
      {isSoldOut && (
        <div className="absolute top-0 left-0 bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-br-lg">
          SOLD OUT
        </div>
      )}
      
      <CardContent className="p-5">
        <div className={`flex items-center gap-2 mb-3 ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
          <Clock className={`h-4 w-4 ${isUrgent ? "animate-pulse" : ""}`} />
          <span className="text-sm font-mono font-medium">
            {isExpired ? "Expired" : formatTime(timeLeft)}
          </span>
          {isUrgent && !isExpired && (
            <Badge variant="destructive" className="text-xs">Ending soon!</Badge>
          )}
        </div>

        <h3 className="font-bold text-lg mb-1">{bundle.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{bundle.description}</p>

        <div className="space-y-2 mb-4">
          {bundle.items?.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span>{item.icon_emoji || getIconEmoji(item.icon)}</span>
              <span>{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.item_name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-primary">€{Number(bundle.sale_price).toFixed(2)}</span>
          <span className="text-lg text-muted-foreground line-through">€{Number(bundle.original_price).toFixed(2)}</span>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Percent className="h-3 w-3 mr-1" />
            {bundle.discount_percent}% OFF
          </Badge>
        </div>

        <Button 
          onClick={() => onBuy(bundle)}
          disabled={isExpired || isSoldOut}
          className="w-full gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {isSoldOut ? "Sold Out" : isExpired ? "Sale Ended" : "Buy Now"}
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
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const { bundles: data, server_time } = await bundlesApi.getActive();
        setBundles(data);
        
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
    const interval = setInterval(fetchBundles, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBuyClick = (bundle: Bundle) => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please login to purchase bundles",
        variant: "destructive",
      });
      return;
    }
    setSelectedBundle(bundle);
    setSelectedRoleId(null);
    setSelectedCharacterName(null);
  };

  const handleCharacterSelect = (roleId: number | null, characterName: string | null) => {
    setSelectedRoleId(roleId);
    setSelectedCharacterName(characterName);
  };

  const bundleOrderPayload: OrderPayload | undefined =
    selectedBundle && selectedRoleId
      ? {
          type: "bundle",
          bundleId: selectedBundle.id,
          characterId: selectedRoleId,
          characterName: selectedCharacterName || "",
        }
      : undefined;

  const handlePaymentSuccess = (data: any) => {
    hapticSuccess();
    toast({ title: "🎉 Bundle purchased!", description: "Items are being delivered to your character." });
    setSelectedBundle(null);
    navigate("/payment-success");
  };

  const handlePaymentError = (message: string) => {
    toast({ title: "Payment Failed", description: message, variant: "destructive" });
  };

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
    return null;
  }

  return (
    <>
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
              onBuy={handleBuyClick}
            />
          ))}
        </div>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={!!selectedBundle} onOpenChange={(open) => !open && setSelectedBundle(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase {selectedBundle?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Bundle Summary */}
            <div className="bg-secondary/30 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{selectedBundle?.name}</span>
                <span className="text-primary font-bold">€{Number(selectedBundle?.sale_price || 0).toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedBundle?.description}</p>
              <div className="mt-3 space-y-1">
                {selectedBundle?.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span>{item.icon_emoji || getIconEmoji(item.icon)}</span>
                    <span>{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.item_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Character Selection */}
            <CharacterSelector 
              onSelect={handleCharacterSelect}
              selectedRoleId={selectedRoleId}
            />

            {/* Card Payment Form */}
            {selectedRoleId && bundleOrderPayload ? (
              <CardPaymentForm
                orderPayload={bundleOrderPayload}
                totalPrice={Number(selectedBundle?.sale_price || 0)}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Select a character to continue to payment
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
