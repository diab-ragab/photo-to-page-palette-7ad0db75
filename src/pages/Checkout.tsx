import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, ChevronLeft, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const API_BASE = "https://woiendgame.online/api";

// Stripe publishable key - this should be your pk_test_ or pk_live_ key
const STRIPE_PUBLISHABLE_KEY = "pk_test_your_publishable_key_here";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface PaymentFormProps {
  clientSecret: string;
  totalPrice: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const PaymentForm = ({ clientSecret, totalPrice, onSuccess, onError }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed");
        onError(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Confirm with backend
        try {
          const confirmRes = await fetch(`${API_BASE}/payment_confirm.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
            }),
          });

          const confirmData = await confirmRes.json();

          if (confirmData.success) {
            onSuccess();
          } else {
            // Payment succeeded but confirmation failed - still show success
            // The webhook will handle fulfillment
            console.warn("Backend confirmation issue:", confirmData.message);
            onSuccess();
          }
        } catch (confirmError) {
          // Payment succeeded but confirmation call failed
          // Still show success, webhook handles fulfillment
          console.warn("Backend confirmation error:", confirmError);
          onSuccess();
        }
      } else if (paymentIntent) {
        setErrorMessage(`Payment status: ${paymentIntent.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          {t('checkout.paymentInfo')}
        </h2>
        
        <PaymentElement 
          options={{
            layout: "tabs",
          }}
        />

        {errorMessage && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full gap-2" 
        size="lg" 
        disabled={isProcessing || !stripe || !elements}
      >
        <Lock className="w-4 h-4" />
        {isProcessing ? t('checkout.processing') : `${t('checkout.pay')} €${totalPrice.toFixed(2)}`}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('checkout.secureNote')}
      </p>
    </form>
  );
};

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    // Create PaymentIntent when page loads
    const createPaymentIntent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Convert price to cents
        const amountInCents = Math.round(totalPrice * 100);

        const response = await fetch(`${API_BASE}/create_payment_intent.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            amount: amountInCents,
            currency: "eur",
          }),
        });

        const data = await response.json();

        if (data.success && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.message || "Failed to initialize payment");
        }
      } catch (err) {
        console.error("Payment init error:", err);
        setError("Failed to connect to payment service");
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [items.length, totalPrice, navigate]);

  const handlePaymentSuccess = () => {
    clearCart();
    toast.success(t('checkout.success'));
    navigate('/payment-success');
  };

  const handlePaymentError = (errorMsg: string) => {
    toast.error(errorMsg);
  };

  if (items.length === 0) {
    return null;
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
          {/* Payment Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {isLoading ? (
              <div className="glass-card p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">Initializing payment...</span>
                </div>
              </div>
            ) : error ? (
              <div className="glass-card p-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Payment Error</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : clientSecret ? (
              <Elements 
                stripe={stripePromise} 
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#f59e0b',
                      colorBackground: '#1a1a2e',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      borderRadius: '8px',
                    },
                  },
                }}
              >
                <PaymentForm 
                  clientSecret={clientSecret}
                  totalPrice={totalPrice}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            ) : null}
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
