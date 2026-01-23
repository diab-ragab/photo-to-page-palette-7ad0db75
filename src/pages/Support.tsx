import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MessageCircle, Mail, HelpCircle, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const Support = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  const breadcrumbs = [
    { name: "Home", url: baseUrl },
    { name: "Support", url: `${baseUrl}/support` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        title="Support"
        description="Get help with WOI Endgame. Contact our support team via Discord or email. Find answers to frequently asked questions."
        keywords="WOI support, help, contact, Discord, FAQ, WOI Endgame support"
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
          <span className="text-foreground">Support</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Support</h1>
        <p className="text-muted-foreground mb-12 max-w-2xl">Need help? We're here for you. Choose the best way to reach us below.</p>
        
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
          {/* Discord Support */}
          <div className="p-6 rounded-xl bg-card/50 border border-border/50">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold mb-2">Discord Support (Recommended)</h2>
            <p className="text-sm text-muted-foreground mb-4">Join our Discord server and open a support ticket for the fastest response.</p>
            <Button variant="outline" className="w-full" asChild>
              <a href="#" target="_blank" rel="noopener noreferrer">Join Discord</a>
            </Button>
          </div>

          {/* Email Support */}
          <div className="p-6 rounded-xl bg-card/50 border border-border/50">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold mb-2">Email Support</h2>
            <p className="text-sm text-muted-foreground mb-4">For billing or account-related issues, contact us via email:</p>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@woiendgame.com">support@woiendgame.com</a>
            </Button>
          </div>
        </div>

        {/* What to Include */}
        <div className="mt-12 p-6 rounded-xl bg-muted/30 border border-border/30 max-w-3xl">
          <div className="flex items-start gap-4">
            <HelpCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-display font-semibold mb-3">What to Include in Your Request</h3>
              <p className="text-sm text-muted-foreground mb-3">To help us assist you faster, please include:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  Account username / Character name
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  Order ID / Transaction ID
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  A clear description of the issue
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  Screenshot or proof of payment (if available)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
