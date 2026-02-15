import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { captureShopOrder, CaptureOrderResponse } from "@/lib/shopApi";
import { useCart } from "@/contexts/CartContext";
import { CheckCircle, XCircle, Loader2, Package, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const ShopSuccess = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [result, setResult] = useState<CaptureOrderResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const capturedRef = useRef(false);
  const { clearCart } = useCart();

  useEffect(() => {
    if (!token || capturedRef.current) return;
    capturedRef.current = true;

    captureShopOrder(token)
      .then((res) => {
        if (res.success && (res.status === "completed" || res.already_captured)) {
          setStatus("success");
          setResult(res);
          clearCart();
        } else {
          setStatus("failed");
          setErrorMsg(res.error || `Order status: ${res.status}`);
          setResult(res);
        }
      })
      .catch((err) => {
        setStatus("failed");
        setErrorMsg(err.message || "Failed to process payment");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Order Status" noIndex />
      <Navbar />
      <div className="container mx-auto px-4 py-32 max-w-lg text-center">
        {status === "loading" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <h1 className="text-2xl font-display font-bold">Processing your payment...</h1>
            <p className="text-muted-foreground">Please wait while we verify and deliver your items.</p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold">Payment Successful!</h1>
            <p className="text-muted-foreground">Your items have been delivered to your character's mailbox.</p>

            {result && (
              <div className="glass-card p-6 text-left space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-bold">#{result.order_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-primary capitalize">{result.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items Delivered</span>
                  <span className="font-semibold">{result.processed_count}</span>
                </div>

                {result.deliveries && result.deliveries.length > 0 && (
                  <div className="border-t border-border pt-4 space-y-2">
                    <h3 className="font-display font-semibold text-sm">Delivery Details</h3>
                    {result.deliveries.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {d.result === "ok" ? (
                          <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span className="text-muted-foreground">{d.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link to="/shop">
              <Button className="gap-2">
                <ShoppingBag className="w-4 h-4" /> Continue Shopping
              </Button>
            </Link>
          </motion.div>
        )}

        {status === "failed" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-3xl font-display font-bold">Payment Issue</h1>
            <p className="text-muted-foreground">{errorMsg || "There was a problem processing your payment."}</p>

            {result?.order_id && (
              <p className="text-sm text-muted-foreground">
                Order ID: <span className="font-mono font-bold">#{result.order_id}</span>
              </p>
            )}

            <div className="flex gap-4 justify-center">
              <Link to="/shop">
                <Button variant="outline">Back to Shop</Button>
              </Link>
              <Link to="/support">
                <Button>Contact Support</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ShopSuccess;
