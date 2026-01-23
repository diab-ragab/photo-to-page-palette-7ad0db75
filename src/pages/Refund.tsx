import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { SEO } from "@/components/SEO";

const Refund = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Refund & Delivery Policy", url: `${baseUrl}/refund` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Refund & Delivery Policy"
        description="WOI Endgame Refund & Delivery Policy. Learn about our refund eligibility, digital product delivery, and support options."
        keywords="WOI refund, delivery policy, digital products, chargebacks, WOI Endgame"
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
          <span className="text-foreground">Refund & Delivery Policy</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">Refund & Delivery Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          {/* Refund Policy Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6 pb-2 border-b border-border">Refund Policy</h2>
            
            <section>
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">1. Donations</h3>
              <p>All donations are voluntary contributions made to support WOI Endgame. Donations are non-refundable, as they are considered gifts to help maintain and improve the server.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">2. VIP Memberships / Elite Pass</h3>
              <p>VIP Memberships and Elite Pass purchases may be eligible for a refund within 24 hours of purchase ONLY if all of the following conditions are met:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>No VIP/Elite benefits have been used or claimed</li>
                <li>The refund request is submitted within 24 hours of purchase</li>
                <li>This is the customer's first refund request</li>
              </ul>
              <p className="mt-2">If any VIP/Elite benefits have been used, activated, or claimed, the purchase becomes non-refundable.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">3. Virtual Currency (Zen) & In-Game Items</h3>
              <p>Zen (virtual currency) and in-game item purchases are non-refundable once delivered to the player's account.</p>
              <p className="mt-2">If the product was not delivered due to a verified technical issue on our side, please contact support and we will assist with delivery or review the request.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">4. Subscription Cancellation (If Applicable)</h3>
              <p>If you have a monthly subscription, you may cancel at any time.</p>
              <p className="mt-2">You will keep access to your VIP benefits until the end of your current billing cycle. No partial refunds are provided for unused time unless required by law.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">5. How to Request a Refund</h3>
              <p>To request a refund, please contact us through our official Discord server and provide:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Account username / Character name</li>
                <li>Transaction ID / Order ID</li>
                <li>Proof of payment (if available)</li>
              </ul>
              <p className="mt-2">Refund requests are reviewed manually. Please allow up to 7 business days for processing (if approved).</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">6. Chargebacks & Payment Disputes</h3>
              <p>Please contact our support team before opening a dispute or filing a chargeback.</p>
              <p className="mt-2">Unauthorized chargebacks or fraudulent disputes may result in account restrictions, suspension, or permanent ban to protect the server economy and prevent abuse.</p>
            </section>
          </div>

          {/* Delivery Policy Section */}
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-6 pb-2 border-b border-border">Delivery Policy (Digital Products)</h2>
            
            <p className="mb-4">WOI Endgame sells digital in-game products only, including:</p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li>Zen (Virtual Currency)</li>
              <li>In-Game Items</li>
              <li>Elite Game Pass / VIP Benefits</li>
            </ul>

            <section>
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">1. Delivery Method</h3>
              <p>All purchases are delivered digitally and added directly to the player's account in WOI Endgame.</p>
              <p className="mt-2">No physical items are shipped.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">2. Delivery Time</h3>
              <p>Delivery is usually instant after successful payment confirmation.</p>
              <p className="mt-2">In some cases, delivery may take a short time due to payment verification or server processing.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">3. Delivery Requirements</h3>
              <p>To ensure correct delivery, the customer must provide accurate information during checkout, such as:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Account username / Character name</li>
                <li>Server name (if applicable)</li>
              </ul>
              <p className="mt-2">WOI Endgame is not responsible for failed delivery caused by incorrect or missing information provided by the customer.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">4. Delivery Confirmation</h3>
              <p>A product is considered delivered once the purchased Zen, item, or Elite Game Pass has been credited to the player's account in-game.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">5. Delayed or Missing Delivery</h3>
              <p>If your purchase is not delivered within a reasonable time, please contact our support team and include:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Order ID / Transaction ID</li>
                <li>Account username / Character name</li>
                <li>Proof of payment (receipt or screenshot)</li>
              </ul>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">6. Fraud Prevention</h3>
              <p>For security and fraud prevention, some orders may be temporarily held for manual review before delivery.</p>
              <p className="mt-2">If additional verification is required, we will contact you through our official support channels.</p>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-display font-semibold text-foreground mb-4">Support Contact</h3>
              <p className="mb-2">For delivery issues, please reach out via:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Discord: <a href="https://discord.gg/UezDH3aaYt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://discord.gg/UezDH3aaYt</a></li>
                <li>Email: <a href="mailto:support@woiendgame.com" className="text-primary hover:underline">support@woiendgame.com</a></li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Refund;
