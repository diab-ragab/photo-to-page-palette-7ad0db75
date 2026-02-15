import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const ShopFailed = () => (
  <div className="min-h-screen bg-background text-foreground">
    <SEO title="Payment Failed" noIndex />
    <Navbar />
    <div className="container mx-auto px-4 py-32 max-w-lg text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-display font-bold">Payment Failed</h1>
        <p className="text-muted-foreground">
          Something went wrong with your payment. Please try again or contact support.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/shop">
            <Button variant="outline">Back to Shop</Button>
          </Link>
          <Link to="/support">
            <Button>Contact Support</Button>
          </Link>
        </div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

export default ShopFailed;
