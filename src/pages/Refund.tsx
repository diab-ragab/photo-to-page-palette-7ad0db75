import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Refund = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container py-20 px-4">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">Refund Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">1. Donations</h2>
            <p>All donations are voluntary contributions to support our server. Donations are non-refundable as they are gifts to support the community.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. VIP Memberships</h2>
            <p>VIP membership purchases may be eligible for a refund within 24 hours of purchase if:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>No VIP benefits have been used</li>
              <li>The request is made within 24 hours of purchase</li>
              <li>This is your first refund request</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. In-Game Credits</h2>
            <p>In-game credit purchases are non-refundable once the credits have been added to your account. If credits were not delivered due to a technical issue, please contact support.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Subscription Cancellation</h2>
            <p>Monthly subscriptions can be cancelled at any time. You will retain access to VIP benefits until the end of your current billing period.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. How to Request a Refund</h2>
            <p>To request a refund:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Contact us through our Discord server</li>
              <li>Provide your username and transaction details</li>
              <li>Allow up to 7 business days for processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. Chargebacks</h2>
            <p>Filing a chargeback without first contacting us will result in permanent account suspension. Please reach out to us first to resolve any issues.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Refund;
