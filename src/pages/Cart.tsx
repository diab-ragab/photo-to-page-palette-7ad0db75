import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEO 
          title="Cart"
          description="Your WOI Endgame shopping cart. Review your items before checkout."
          noIndex={true}
        />
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <ShoppingBag className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-display font-bold mb-4">{t('cart.empty')}</h1>
          <p className="text-muted-foreground mb-8">{t('cart.emptyDescription')}</p>
          <Link to="/shop">
            <Button size="lg" className="gap-2">
              {t('cart.continueShopping')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Cart"
        description="Your WOI Endgame shopping cart. Review your items before checkout."
        noIndex={true}
      />
      <div className="container mx-auto px-4 py-24">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('nav.home')}
        </Link>
        <h1 className="text-4xl font-display font-bold mb-8">{t('cart.title')}</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                <div className="w-20 h-20 bg-secondary/50 rounded-lg flex items-center justify-center text-4xl">
                  {item.image}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-display font-semibold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p className="text-primary font-bold">€{Number(item.price).toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-right min-w-[80px]">
                  <p className="font-bold">€{(Number(item.price) * item.quantity).toFixed(2)}</p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-xl font-display font-bold mb-4">{t('cart.summary')}</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('cart.items')} ({totalItems})</span>
                  <span>€{Number(totalPrice).toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                  <span>{t('cart.total')}</span>
                  <span className="text-primary">€{Number(totalPrice).toFixed(2)}</span>
                </div>
              </div>

              <Link to="/checkout">
                <Button className="w-full gap-2" size="lg">
                  {t('cart.checkout')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              
              <Link to="/shop" className="block mt-4">
                <Button variant="outline" className="w-full">
                  {t('cart.continueShopping')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Cart;
