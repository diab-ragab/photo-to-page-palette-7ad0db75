import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { SEO } from "@/components/SEO";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Privacy Policy"
        description="WOI Endgame Privacy Policy. Learn how we collect, use, and protect your personal information."
        keywords="WOI privacy, data protection, privacy policy, WOI Endgame"
      />
      <Navbar />
      <main className="container py-20 px-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Privacy Policy</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly, including:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Account registration details (username, email)</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Game activity and preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Provide and maintain our services</li>
              <li>Process transactions</li>
              <li>Send important updates and announcements</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data. Payment information is handled by Stripe and never stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Third-Party Services</h2>
            <p>We use trusted third-party services including:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Stripe for payment processing</li>
              <li>Discord for community communication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Contact us through Discord to make such requests.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. Updates</h2>
            <p>This policy may be updated periodically. We will notify users of significant changes through our Discord server.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
