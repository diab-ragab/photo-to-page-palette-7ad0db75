import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { ShieldCheck, CreditCard, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      clearCart();
      toast.success(t('checkout.success'));
      navigate('/shop');
    }, 2000);
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-4xl font-display font-bold mb-8">{t('checkout.title')}</h1>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Info */}
              <div className="glass-card p-6">
                <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  {t('checkout.accountInfo')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">{t('checkout.username')}</Label>
                    <Input id="username" placeholder={t('checkout.usernamePlaceholder')} required />
                  </div>
                  <div>
                    <Label htmlFor="email">{t('checkout.email')}</Label>
                    <Input id="email" type="email" placeholder="your@email.com" required />
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="glass-card p-6">
                <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {t('checkout.paymentInfo')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardName">{t('checkout.cardName')}</Label>
                    <Input id="cardName" placeholder="John Doe" required />
                  </div>
                  <div>
                    <Label htmlFor="cardNumber">{t('checkout.cardNumber')}</Label>
                    <Input id="cardNumber" placeholder="4242 4242 4242 4242" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">{t('checkout.expiry')}</Label>
                      <Input id="expiry" placeholder="MM/YY" required />
                    </div>
                    <div>
                      <Label htmlFor="cvv">{t('checkout.cvv')}</Label>
                      <Input id="cvv" placeholder="123" required />
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" size="lg" disabled={isProcessing}>
                <Lock className="w-4 h-4" />
                {isProcessing ? t('checkout.processing') : `${t('checkout.pay')} €${totalPrice.toFixed(2)}`}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('checkout.secureNote')}
              </p>
            </form>
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
                    <p className="font-bold">€{(item.price * item.quantity).toFixed(2)}</p>
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
