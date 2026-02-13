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
            <p>By accessing or using WOI Endgame services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p>WOI Endgame is a private gaming server that provides digital entertainment services including VIP memberships, game passes, and virtual in-game credits for use within the server.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. Digital Products</h2>
            <p>All purchases made on WOI Endgame are digital products delivered in-game. These include:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>VIP memberships</li>
              <li>Game Pass subscriptions</li>
              <li>Virtual in-game credits (Zen)</li>
            </ul>
            <p className="mt-3">All virtual items and credits:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Are usable only within WOI Endgame</li>
              <li>Have no real-world monetary value</li>
              <li>Cannot be exchanged for real currency</li>
              <li>Cannot be transferred outside the game</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Delivery Policy</h2>
            <p>All digital purchases are delivered automatically to the user's in-game account after successful payment confirmation.</p>
            <p className="mt-2">Delivery is typically instant but may take a short time in some cases.</p>
            <p className="mt-2">If delivery is not received, users must contact support through our official Discord.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. Refund Policy</h2>
            <p>Due to the nature of digital goods and instant delivery, all purchases are considered final and non-refundable once delivered.</p>
            <p className="mt-2">Refunds may only be considered if:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Payment was completed but items were not delivered</li>
              <li>A technical error prevented delivery</li>
            </ul>
            <p className="mt-3">Unauthorized disputes or chargebacks may result in permanent suspension of the account and services.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. User Responsibility</h2>
            <p>Users are responsible for maintaining the security of their accounts and all activities under them.</p>
            <p className="mt-2">WOI Endgame is not responsible for losses resulting from shared accounts or user negligence.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">7. Prohibited Activities</h2>
            <p>The following actions are strictly prohibited:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Cheating or exploiting game systems</li>
              <li>Harassment or abuse toward players or staff</li>
              <li>Account sharing or selling</li>
              <li>Real-money trading outside the official store</li>
              <li>Fraudulent payments or chargebacks</li>
            </ul>
            <p className="mt-3">Violation may result in account suspension or permanent ban.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">8. Service Changes</h2>
            <p>WOI Endgame reserves the right to modify services, pricing, or these Terms at any time without prior notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
            <p>WOI Endgame is provided as an online entertainment service. We are not liable for service interruptions, data loss, or account issues beyond our control.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">10. Contact</h2>
            <p>For support or payment-related issues, contact us via the official WOI Endgame Discord server.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
