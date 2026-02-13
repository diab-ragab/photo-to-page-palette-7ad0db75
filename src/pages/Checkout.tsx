import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, ChevronLeft, AlertCircle, Loader2, Gift } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { CharacterSelector } from "@/components/shop/CharacterSelector";
import { apiPost, FetchJsonError } from "@/lib/apiFetch";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { t } = useLanguage();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null);
  const [isGift, setIsGift] = useState(false);
  const [giftCharacterName, setGiftCharacterName] = useState("");

  const handleCharacterSelect = (roleId: number | null, characterName: string | null) => {
    setSelectedRoleId(roleId);
    setSelectedCharacterName(characterName);
  };

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      toast.error("Please login to complete your purchase");
      return;
    }

    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    if (isGift) {
      if (!giftCharacterName.trim()) {
        toast.error("Please enter the recipient's character name");
        setError("Please enter a character name to gift to");
        return;
      }
    } else {
      if (!selectedRoleId) {
        toast.error("Please select a character to receive the items");
        setError("Please select a character");
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem("woi_session_token") || "";
      
      const cartItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
      }));

      const data = await apiPost<any>(
        `/paypal_checkout.php?sessionToken=${encodeURIComponent(token)}`,
        { 
          items: cartItems,
          character_id: isGift ? 0 : selectedRoleId,
          character_name: isGift ? "" : selectedCharacterName,
          is_gift: isGift,
          gift_character_name: isGift ? giftCharacterName.trim() : "",
          sessionToken: token,
        },
        true,
        { showErrorToast: false, retries: 1 }
      );

      if (data.success && data.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        setError(data.message || "Failed to initialize payment");
        toast.error(data.message || "Failed to initialize payment");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      const msg = err?.serverMessage || err?.message || "Failed to connect to payment service";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-display font-bold mb-4">Your cart is empty</h1>
          <Link to="/shop">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Checkout"
        description="Complete your WOI Endgame purchase securely."
        noIndex={true}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <Link 
          to="/cart" 
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('cart.title')}
        </Link>
        <h1 className="text-4xl font-display font-bold mb-8">{t('checkout.title')}</h1>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Checkout Action */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-display font-bold">Secure Payment</h2>
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to PayPal's secure checkout
                  </p>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                  <span>PCI DSS compliant</span>
                </div>
              </div>

              {/* Gift Toggle */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label htmlFor="gift-toggle" className="flex items-center gap-2 cursor-pointer">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="font-medium">Send as Gift</span>
                  </Label>
                  <Switch
                    id="gift-toggle"
                    checked={isGift}
                    onCheckedChange={setIsGift}
                  />
                </div>

                {isGift ? (
                  <div className="space-y-2">
                    <Label htmlFor="gift-name" className="text-sm text-muted-foreground">
                      Recipient's Character Name
                    </Label>
                    <Input
                      id="gift-name"
                      placeholder="Enter character name..."
                      value={giftCharacterName}
                      onChange={(e) => setGiftCharacterName(e.target.value)}
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      Items will be delivered to this character's in-game mailbox
                    </p>
                  </div>
                ) : (
                  <CharacterSelector 
                    onSelect={handleCharacterSelect}
                    selectedRoleId={selectedRoleId}
                  />
                )}
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={handleCheckout}
                className="w-full gap-2" 
                size="lg" 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to PayPal...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {`${t('checkout.pay')} €${totalPrice.toFixed(2)}`}
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('checkout.secureNote')}
              </p>
            </div>
          </motion.div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-xl font-display font-bold mb-4">{t('checkout.orderSummary')}</h2>
              
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <span className="text-2xl">{item.image}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <p className="font-bold">€{(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('checkout.subtotal')}</span>
                  <span>€{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl">
                  <span>{t('cart.total')}</span>
                  <span className="text-primary">€{totalPrice.toFixed(2)}</span>
                </div>
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
