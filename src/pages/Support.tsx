import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MessageCircle, Mail, HelpCircle, Clock, ChevronRight, Home, AlertTriangle } from "lucide-react";
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
        <p className="text-muted-foreground mb-12 max-w-2xl">Need help? Our support team is here for you. Choose the best way to contact us below.</p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          {/* Discord Support */}
          <div className="p-6 rounded-xl bg-card/50 border border-border/50">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold mb-2">Discord Support</h2>
            <p className="text-sm text-muted-foreground mb-3">Join our official Discord server for real-time support from our staff and community.</p>
            <p className="text-sm text-muted-foreground mb-4">Our team is active daily and can assist with:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-5">
              <li>Purchase or delivery issues</li>
              <li>Account support</li>
              <li>Technical problems</li>
              <li>General questions</li>
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <a href="https://discord.gg/52eh9tHqab" target="_blank" rel="noopener noreferrer">Join Discord</a>
            </Button>
          </div>

          {/* Email Support */}
          <div className="p-6 rounded-xl bg-card/50 border border-border/50">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold mb-2">Email Support</h2>
            <p className="text-sm text-muted-foreground mb-3">For billing inquiries or account-related issues, you may also contact us via email.</p>
            <p className="text-sm text-muted-foreground mb-1 font-medium text-foreground">Support Email:</p>
            <p className="text-sm text-primary mb-4">admin@woiendgame.online</p>
            <p className="text-sm text-muted-foreground mb-2">Please include:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-5">
              <li>Your username</li>
              <li>Transaction ID (if related to a purchase)</li>
              <li>Clear description of the issue</li>
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:admin@woiendgame.online">Send Email</a>
            </Button>
          </div>

          {/* FAQ */}
          <div className="p-6 rounded-xl bg-card/50 border border-border/50">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold mb-2">FAQ</h2>
            <p className="text-sm text-muted-foreground mb-4">Check our FAQ section for quick answers to common questions regarding purchases, delivery, and gameplay.</p>
            <Button variant="outline" className="w-full mb-2" asChild>
              <a href="/#faq">View FAQ</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/refund-faq">Refund FAQ</Link>
            </Button>
          </div>
        </div>

        {/* Response Time */}
        <div className="mt-12 p-6 rounded-xl bg-muted/30 border border-border/30 max-w-4xl">
          <div className="flex items-start gap-4">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-display font-semibold mb-1">Response Times</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Discord Support: Usually within a few hours</li>
                <li>Email Support: 1–2 business days</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="mt-6 p-6 rounded-xl border border-destructive/30 bg-destructive/5 max-w-4xl flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display font-semibold text-foreground mb-1">Important Notice</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For payment or delivery issues, always contact us first before opening any payment dispute. Our team will resolve issues quickly and ensure you receive your purchase.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
