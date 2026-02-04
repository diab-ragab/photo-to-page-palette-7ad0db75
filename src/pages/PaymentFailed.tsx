import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { XCircle, RefreshCw, ShoppingBag } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { bundlesApi } from "@/lib/bundlesApi";

const PaymentFailed = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  // Restore bundle stock on payment failure/cancellation
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      bundlesApi.cancelOrder(sessionId);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Payment Failed"
        description="Your payment could not be processed."
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
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center"
            >
              <XCircle className="w-10 h-10 text-destructive" />
            </motion.div>
            
            <h1 className="text-3xl font-display font-bold mb-4">
              Payment Failed
            </h1>
            
            <p className="text-muted-foreground mb-8">
              We couldn't process your payment. Please check your payment details and try again, or use a different payment method.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/shop">
                  <ShoppingBag className="w-4 h-4" />
                  Back to Shop
                </Link>
              </Button>
              <Button asChild className="gap-2">
                <Link to="/cart">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentFailed;
