import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { SEO } from "@/components/SEO";

const Refund = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Refund Policy", url: `${baseUrl}/refund` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Refund Policy"
        description="WOI Endgame Refund Policy. Learn about our refund eligibility for VIP memberships, in-game credits, and donations."
        keywords="WOI refund, refund policy, chargebacks, WOI Endgame"
        breadcrumbs={breadcrumbs}
      />
      <Navbar />
      <main className="container py-20 px-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Refund Policy</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">Refund Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">1. Donations</h2>
            <p>All donations are voluntary contributions made to support WOI Endgame. Donations are non-refundable, as they are considered gifts to help maintain and improve the server.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. VIP Memberships / Elite Pass</h2>
            <p>VIP Memberships and Elite Pass purchases may be eligible for a refund within 24 hours of purchase ONLY if all of the following conditions are met:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>No VIP/Elite benefits have been used or claimed</li>
              <li>The refund request is submitted within 24 hours of purchase</li>
              <li>This is the customer's first refund request</li>
            </ul>
            <p className="mt-2">If any VIP/Elite benefits have been used, activated, or claimed, the purchase becomes non-refundable.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. Virtual Currency (Zen) & In-Game Items</h2>
            <p>Zen (virtual currency) and in-game item purchases are non-refundable once delivered to the player's account.</p>
            <p className="mt-2">If the product was not delivered due to a verified technical issue on our side, please contact support and we will assist with delivery or review the request.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Subscription Cancellation (If Applicable)</h2>
            <p>If you have a monthly subscription, you may cancel at any time.</p>
            <p className="mt-2">You will keep access to your VIP benefits until the end of your current billing cycle. No partial refunds are provided for unused time unless required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. How to Request a Refund</h2>
            <p>To request a refund, please contact us through our official Discord server and provide:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Account username / Character name</li>
              <li>Transaction ID / Order ID</li>
              <li>Proof of payment (if available)</li>
            </ul>
            <p className="mt-2">Refund requests are reviewed manually. Please allow up to 7 business days for processing (if approved).</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. Chargebacks & Payment Disputes</h2>
            <p>Please contact our support team before opening a dispute or filing a chargeback.</p>
            <p className="mt-2">Unauthorized chargebacks or fraudulent disputes may result in account restrictions, suspension, or permanent ban to protect the server economy and prevent abuse.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Refund;
