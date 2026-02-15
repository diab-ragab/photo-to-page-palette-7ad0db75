import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import { createShopOrder } from "@/lib/shopApi";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ShieldCheck, Lock, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Checkout = () => {
  const { items, totalPrice } = useCart();
  const { user, isLoggedIn } = useAuth();
  const [accountName, setAccountName] = useState(user?.username || "");
  const [characterName, setCharacterName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-display font-bold mb-4">Your cart is empty</h1>
          <Link to="/shop"><Button>Continue Shopping</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      toast.error("Please log in first");
      return;
    }
    if (!accountName.trim()) {
      setError("Account name is required");
      return;
    }
    if (!characterName.trim()) {
      setError("Character name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createShopOrder({
        cart: items.map((i) => ({ product_id: parseInt(i.id), qty: i.quantity })),
        account_name: accountName.trim(),
        character_name: characterName.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to create order");
        return;
      }

      // Redirect to PayPal approval
      if (res.approveUrl) {
        window.location.href = res.approveUrl;
      } else {
        setError("No PayPal approval URL received");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Checkout" description="Complete your WOI Endgame purchase." noIndex />
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </Link>
        <h1 className="text-4xl font-display font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="glass-card p-6 space-y-6">
              <div>
                <h2 className="text-xl font-display font-bold mb-1">Delivery Details</h2>
                <p className="text-sm text-muted-foreground">Items will be delivered to your character's in-game mailbox.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account">Account Name</Label>
                  <Input
                    id="account"
                    placeholder="Your account name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    maxLength={64}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="character">Character Name</Label>
                  <Input
                    id="character"
                    placeholder="Your character name"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    maxLength={64}
                  />
                  <p className="text-xs text-muted-foreground">Must match an active character in-game.</p>
                </div>
              </div>

              {/* Security */}
              <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Secured with PayPal</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Buyer protection included</span>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground border border-border rounded-lg p-3 bg-secondary/20">
                ⚠️ All digital purchases are <strong>non-refundable</strong>. By clicking "Pay with PayPal" you agree to our Terms of Service.
              </p>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={handleCheckout}
                disabled={loading || !accountName.trim() || !characterName.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  `Pay €${totalPrice.toFixed(2)} with PayPal`
                )}
              </Button>
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-xl font-display font-bold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center text-lg shrink-0">
                      {item.image && item.image.startsWith("http") ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover rounded" />
                      ) : "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <p className="font-bold text-sm">€{(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 flex justify-between font-bold text-xl">
                <span>Total</span>
                <span className="text-primary">€{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
