import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { XCircle, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const ShopCancel = () => (
  <div className="min-h-screen bg-background text-foreground">
    <SEO title="Payment Cancelled" noIndex />
    <Navbar />
    <div className="container mx-auto px-4 py-32 max-w-lg text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
          <XCircle className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-display font-bold">Payment Cancelled</h1>
        <p className="text-muted-foreground">
          Your payment was cancelled. No charges were made. Your cart items are still saved.
        </p>
        <Link to="/shop">
          <Button className="gap-2">
            <ShoppingBag className="w-4 h-4" /> Return to Shop
          </Button>
        </Link>
      </motion.div>
    </div>
    <Footer />
  </div>
);

export default ShopCancel;
