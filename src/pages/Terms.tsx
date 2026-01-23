import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { SEO } from "@/components/SEO";

const Terms = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Terms of Service", url: `${baseUrl}/terms` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Terms of Service"
        description="Read the WOI Endgame Terms of Service. Understand your rights and responsibilities when using our private server gaming services."
        keywords="WOI terms, terms of service, gaming rules, WOI Endgame policies"
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
          <span className="text-foreground">Terms of Service</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p>By accessing, purchasing from, or using WOI Endgame services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p>WOI Endgame provides private server gaming services and digital in-game products, including VIP memberships, Elite Game Pass, virtual currency (Zen), and in-game items.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Any actions performed through your account are considered your responsibility.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Virtual Currency & Digital Items</h2>
            <p>All virtual currency (Zen), Elite Game Pass, and in-game items are digital products intended for use only inside WOI Endgame.</p>
            <p className="mt-2">They have no real-world monetary value and cannot be exchanged, transferred, or withdrawn as real money.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. Payment, Delivery & Refund Policy</h2>
            <p>All purchases are delivered digitally to your account after successful payment confirmation.</p>
            <p className="mt-2">Due to the digital nature of the products and instant delivery, all sales are final and non-refundable once delivered.</p>
            <p className="mt-2">Refunds may only be considered in cases of non-delivery caused by a verified technical issue on our side. In such cases, you must contact support within 24 hours of purchase and provide:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Order ID / Transaction ID</li>
              <li>Account username / Character name</li>
              <li>Proof of payment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. Chargebacks & Disputes</h2>
            <p>Unauthorized chargebacks, payment disputes, or fraudulent claims may result in account restrictions, suspension, or permanent bans to protect the server economy and prevent abuse.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">7. Prohibited Conduct</h2>
            <p className="mb-2">The following actions are strictly prohibited:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Using cheats, exploits, bots, or unauthorized third-party software</li>
              <li>Harassing, threatening, or abusing other players</li>
              <li>Sharing account credentials or account selling</li>
              <li>Real-money trading (RMT) of in-game currency or items</li>
              <li>Any attempts to abuse the payment or reward systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">8. Modifications</h2>
            <p>We reserve the right to update or modify these Terms of Service at any time. Continued use of our services after changes are published constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">9. Contact</h2>
            <p>For any questions, billing issues, or support requests, please contact us through our official Discord server.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
