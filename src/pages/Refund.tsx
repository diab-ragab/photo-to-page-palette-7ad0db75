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
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">1. General Policy</h2>
            <p>All purchases made on WOI Endgame are for digital products delivered in-game.</p>
            <p className="mt-2">By completing a purchase, you agree to this refund policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. Donations</h2>
            <p>All donations are voluntary contributions made to support the server and community.</p>
            <p className="mt-2">Donations are non-refundable.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. VIP Memberships & Game Pass</h2>
            <p>VIP memberships and Game Pass purchases may be eligible for a refund within 24 hours of purchase only if:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>No VIP or Game Pass benefits have been used</li>
              <li>The request is submitted within 24 hours</li>
              <li>This is the first refund request on the account</li>
            </ul>
            <p className="mt-3">Once VIP or Game Pass benefits have been activated or used, the purchase becomes non-refundable.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Virtual Currency (Zen)</h2>
            <p>All in-game credit purchases (Zen) are non-refundable once successfully delivered to the account.</p>
            <p className="mt-2">If Zen was not delivered due to a verified technical issue, users must contact support and the issue will be investigated and resolved.</p>
            <p className="mt-3">Virtual currency:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Has no real-world monetary value</li>
              <li>Cannot be exchanged for real money</li>
              <li>Is for in-game use only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. Subscription Cancellation</h2>
            <p>If applicable, recurring subscriptions may be cancelled at any time.</p>
            <p className="mt-2">Access to VIP benefits will remain active until the end of the current billing period.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. Delivery Issues</h2>
            <p>If a purchase was completed but not delivered:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Contact support via the official Discord</li>
              <li>Provide username and transaction ID</li>
              <li>Delivery issues are usually resolved quickly after verification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">7. Chargebacks & Payment Disputes</h2>
            <p>Opening a chargeback or payment dispute without contacting support first is considered payment abuse.</p>
            <p className="mt-2">Accounts involved in unauthorized chargebacks may be:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Permanently suspended</li>
              <li>Blocked from future purchases</li>
              <li>Restricted from services</li>
            </ul>
            <p className="mt-3">We strongly encourage contacting support first so we can resolve any issues quickly.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">8. Processing Time</h2>
            <p>Approved refunds (if applicable) may take 3–7 business days depending on the payment provider.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">9. Contact</h2>
            <p>All refund or payment-related requests must be submitted through the official WOI Endgame Discord support channel.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Refund;
