import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, ChevronLeft, AlertCircle, Gift, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { CharacterSelector } from "@/components/shop/CharacterSelector";
import { OrderPayload } from "@/lib/paypalOrderApi";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardPaymentForm } from "@/components/shop/CardPaymentForm";
import { hapticSuccess } from "@/hooks/useHapticFeedback";

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { t } = useLanguage();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null);
  const [isGift, setIsGift] = useState(false);
  const [giftCharacterName, setGiftCharacterName] = useState("");

  const handleCharacterSelect = (roleId: number | null, characterName: string | null) => {
    setSelectedRoleId(roleId);
    setSelectedCharacterName(characterName);
  };

  // Validate before showing card form
  const isReadyToPay = () => {
    if (!isLoggedIn) return false;
    if (items.length === 0) return false;
    if (isGift) {
      return giftCharacterName.trim().length > 0;
    }
    return selectedRoleId !== null && selectedRoleId > 0;
  };

  const handlePaymentSuccess = (data: any) => {
    hapticSuccess();
    clearCart();
    toast.success("Payment successful! Items are being delivered.");
    navigate("/payment-success");
  };

  const handlePaymentError = (message: string) => {
    setError(message);
    toast.error(message);
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
          {/* Payment Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="glass-card p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-display font-bold">Card Payment</h2>
                  <p className="text-sm text-muted-foreground">
                    Pay securely with credit or debit card
                  </p>
                </div>
              </div>

              {/* Security Badges */}
              <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                  <span>PCI DSS compliant · 3D Secure</span>
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
                      onChange={(e) => {
                        const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                        setGiftCharacterName(sanitized);
                      }}
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

              {/* Error */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Card Payment Form */}
              {isReadyToPay() && (
                <div className="border-t border-border pt-4">
                  <CardPaymentForm
                    orderPayload={{
                      type: "webshop",
                      items: items.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: Number(item.price),
                        quantity: item.quantity,
                      })),
                      characterId: isGift ? 0 : (selectedRoleId || 0),
                      characterName: isGift ? "" : (selectedCharacterName || ""),
                      isGift,
                      giftCharacterName: isGift ? giftCharacterName.trim() : "",
                    } satisfies OrderPayload}
                    totalPrice={totalPrice}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </div>
              )}

              {!isReadyToPay() && (
                <div className="border-t border-border pt-4">
                  <div className="text-center py-6 text-muted-foreground">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      {isGift 
                        ? "Enter a recipient character name to continue"
                        : "Select a character to continue to payment"
                      }
                    </p>
                  </div>
                </div>
              )}

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
