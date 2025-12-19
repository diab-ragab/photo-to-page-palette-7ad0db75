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
            <p>By accessing and using WOI Endgame services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p>WOI Endgame provides private server gaming services including VIP memberships, in-game credits, and donation-based support options.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Virtual Currency & Items</h2>
            <p>All in-game credits and virtual items are for use within our services only. They have no real-world monetary value and cannot be exchanged for cash.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. Prohibited Conduct</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Using cheats, exploits, or unauthorized third-party software</li>
              <li>Harassing or abusing other players</li>
              <li>Sharing account credentials</li>
              <li>Real-money trading of in-game items</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. Modifications</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of our services constitutes acceptance of any changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">7. Contact</h2>
            <p>For questions about these terms, please contact us through our Discord server.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
