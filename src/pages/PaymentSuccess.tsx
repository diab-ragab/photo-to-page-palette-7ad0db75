import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { CheckCircle, ShoppingBag, Home } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useEffect, useState } from "react";

const API_BASE = "https://woiendgame.online/api";

const PaymentSuccess = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Handle redirect from Stripe with payment_intent in URL
  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');

    if (paymentIntent && redirectStatus === 'succeeded' && !confirmed) {
      setIsConfirming(true);
      
      // Confirm with backend
      fetch(`${API_BASE}/payment_confirm.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentIntentId: paymentIntent }),
      })
        .then(res => res.json())
        .then(data => {
          console.log("Payment confirmed:", data);
          setConfirmed(true);
        })
        .catch(err => {
          console.error("Confirmation error:", err);
          // Still show success - webhook handles fulfillment
          setConfirmed(true);
        })
        .finally(() => {
          setIsConfirming(false);
        });
    } else if (!paymentIntent) {
      // Direct navigation without Stripe redirect
      setConfirmed(true);
    }
  }, [searchParams, confirmed]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Payment Successful"
        description="Your payment has been processed successfully."
        noIndex={true}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="glass-card p-8">
            {isConfirming ? (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
                <h1 className="text-3xl font-display font-bold mb-4">
                  Processing...
                </h1>
                <p className="text-muted-foreground mb-8">
                  Confirming your payment, please wait...
                </p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </motion.div>
                
                <h1 className="text-3xl font-display font-bold mb-4">
                  {t('checkout.success') || 'Payment Successful!'}
                </h1>
                
                <p className="text-muted-foreground mb-8">
                  Thank you for your purchase! Your items will be delivered to your account shortly.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild variant="outline" className="gap-2">
                    <Link to="/shop">
                      <ShoppingBag className="w-4 h-4" />
                      Continue Shopping
                    </Link>
                  </Button>
                  <Button asChild className="gap-2">
                    <Link to="/">
                      <Home className="w-4 h-4" />
                      Back to Home
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
