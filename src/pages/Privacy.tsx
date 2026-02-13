import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { SEO } from "@/components/SEO";

const Privacy = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Privacy Policy", url: `${baseUrl}/privacy` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Privacy Policy"
        description="WOI Endgame Privacy Policy. Learn how we collect, use, and protect your personal information."
        keywords="WOI privacy, data protection, privacy policy, WOI Endgame"
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
          <span className="text-foreground">Privacy Policy</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly when using our services, including:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Account information (username, email address)</li>
              <li>In-game account and character data</li>
              <li>Purchase and transaction details</li>
              <li>Basic technical data such as IP address and browser type</li>
            </ul>
            <p className="mt-3">We only collect information necessary to operate and maintain our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Provide and maintain WOI Endgame services</li>
              <li>Process payments and deliver digital purchases</li>
              <li>Provide customer support</li>
              <li>Send important service updates or announcements</li>
              <li>Prevent fraud and unauthorized activity</li>
              <li>Improve gameplay experience and system security</li>
            </ul>
            <p className="mt-3">We do not sell or rent your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. Payment Processing</h2>
            <p>All payments are processed securely through trusted third-party payment providers such as PayPal.</p>
            <p className="mt-2">We do not store your full payment details (card numbers or financial data) on our servers.</p>
            <p className="mt-2">Payment providers handle and secure all sensitive payment information.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Data Security</h2>
            <p>We implement appropriate security measures to protect user data from unauthorized access, alteration, or misuse.</p>
            <p className="mt-2">While we take reasonable steps to protect data, no online service can guarantee complete security.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. Third-Party Services</h2>
            <p>We may use trusted third-party services to operate our platform, including:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>PayPal for payment processing</li>
              <li>Discord for community communication and support</li>
              <li>Hosting and security providers required for server operation</li>
            </ul>
            <p className="mt-3">These services may process limited user data only as necessary to provide their functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. Data Retention</h2>
            <p>We retain user information only as long as necessary to provide services, maintain security, and comply with legal obligations.</p>
            <p className="mt-2">Users may request deletion of their account data at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Request access to your stored data</li>
              <li>Request correction of incorrect information</li>
              <li>Request deletion of your data</li>
            </ul>
            <p className="mt-3">Requests can be made through our official Discord support channel.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time.</p>
            <p className="mt-2">Significant changes will be announced through our official Discord server or website.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">9. Contact</h2>
            <p>For privacy-related questions or requests, contact us through the official WOI Endgame Discord support.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
