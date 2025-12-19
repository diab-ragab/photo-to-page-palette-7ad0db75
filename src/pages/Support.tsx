import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MessageCircle, Mail, HelpCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const Support = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container py-20 px-4">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Support</h1>
        <p className="text-muted-foreground mb-12 max-w-2xl">Need help? We're here for you. Choose the best way to reach us below.</p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          {/* Discord Support */}
          <div className="p-6 rounded-xl bg-card/50 border border-border/50">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold mb-2">Discord Support</h2>
            <p className="text-sm text-muted-foreground mb-4">Join our Discord server for real-time support from our team and community.</p>
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
            <p className="text-sm text-muted-foreground mb-4">Send us an email for billing inquiries or account issues.</p>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@woiendgame.com">Send Email</a>
            </Button>
          </div>

          {/* FAQ */}
          <div className="p-6 rounded-xl bg-card/50 border border-border/50">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold mb-2">FAQ</h2>
            <p className="text-sm text-muted-foreground mb-4">Check our frequently asked questions for quick answers.</p>
            <Button variant="outline" className="w-full" asChild>
              <a href="/#faq">View FAQ</a>
            </Button>
          </div>
        </div>

        {/* Response Time */}
        <div className="mt-12 p-6 rounded-xl bg-muted/30 border border-border/30 max-w-4xl">
          <div className="flex items-start gap-4">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-display font-semibold mb-1">Response Times</h3>
              <p className="text-sm text-muted-foreground">
                Discord: Usually within a few hours<br />
                Email: 1-2 business days
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
