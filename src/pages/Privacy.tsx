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
            <p>We collect information that you provide directly, including:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Account registration details (such as username and email)</li>
              <li>Purchase and transaction details (payments are processed securely by third-party payment providers)</li>
              <li>Gameplay activity and preferences (for service operation and improvement)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Provide, operate, and maintain WOI Endgame services</li>
              <li>Process purchases and deliver digital products (Zen, in-game items, Elite Game Pass)</li>
              <li>Communicate important updates, support responses, and service announcements</li>
              <li>Improve gameplay experience, performance, and security</li>
              <li>Prevent fraud, abuse, and unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">3. Payment Processing</h2>
            <p>All payments are handled securely by third-party payment processors (such as PayPal, Paddle, or other providers you choose).</p>
            <p className="mt-2">We do not store full payment card details on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">4. Data Security</h2>
            <p>We apply reasonable and industry-standard security measures to protect user information.</p>
            <p className="mt-2">However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">5. Third-Party Services</h2>
            <p>We may use trusted third-party services to operate and support our community and services, including:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Payment processors (e.g., PayPal / Paddle)</li>
              <li>Discord (community communication and support)</li>
            </ul>
            <p className="mt-2">These third parties may process limited data as needed to provide their services and are governed by their own privacy policies.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">6. Data Retention</h2>
            <p>We retain personal data only as long as necessary to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Provide the service</li>
              <li>Maintain account and purchase history</li>
              <li>Comply with legal and security requirements</li>
              <li>Prevent fraud and disputes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">7. Your Rights</h2>
            <p>You have the right to request access, correction, or deletion of your personal data.</p>
            <p className="mt-2">To make a request, please contact us through our official Discord server support channel.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">8. Updates to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Significant changes will be communicated through our Discord server.</p>
            <p className="mt-2">Continued use of WOI Endgame services after updates means you accept the revised policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">9. Contact</h2>
            <p>For privacy-related questions or requests, please contact us via our official Discord server.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
