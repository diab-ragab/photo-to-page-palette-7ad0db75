import { Github, Twitter, MessageCircle, Youtube, Mail, MapPin, Gamepad2, Shield, Sword } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Footer = () => {
  return (
    <footer className="relative pt-16 pb-8 px-4 border-t border-border/50 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <Gamepad2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">WOI Endgame</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              The ultimate private server experience. Relive the legend and dominate the endgame with our custom content and active community.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/20 border border-border/50 hover:border-primary/50 flex items-center justify-center transition-all duration-300 group"
              >
                <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/20 border border-border/50 hover:border-primary/50 flex items-center justify-center transition-all duration-300 group"
              >
                <Twitter className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/20 border border-border/50 hover:border-primary/50 flex items-center justify-center transition-all duration-300 group"
              >
                <Youtube className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/20 border border-border/50 hover:border-primary/50 flex items-center justify-center transition-all duration-300 group"
              >
                <Github className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sword className="w-4 h-4 text-primary" />
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  Home
                </Link>
              </li>
              <li>
                <a href="#classes" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  Classes
                </a>
              </li>
              <li>
                <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  Features
                </a>
              </li>
              <li>
                <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  Shop
                </Link>
              </li>
              <li>
                <a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Stay Updated
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe for updates, patch notes, and exclusive offers.
            </p>
            <div className="flex gap-2">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-muted/50 border-border/50 focus:border-primary/50"
              />
              <Button variant="hero" size="icon" className="shrink-0">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              No spam, unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-border/50 pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <span className="text-xs text-muted-foreground">Secure payments via:</span>
            <div className="flex items-center gap-3">
              <div className="bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/50 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-8 h-5" fill="currentColor">
                  <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102h2.037zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.013 1.08.963 1.683 1.7 2.042.756.367 1.01.603 1.006.931-.005.503-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.375-2.566zm5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488l.233 1.12zm-2.166-2.656l1.02-2.815.588 2.815h-1.608zm-8.17-4.84l-1.603 7.496H8.34l1.605-7.496h1.925z" fill="#1A1F71"/>
                </svg>
                <span className="text-xs text-muted-foreground">Visa</span>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/50 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-8 h-5">
                  <circle cx="7" cy="12" r="7" fill="#EB001B"/>
                  <circle cx="17" cy="12" r="7" fill="#F79E1B"/>
                  <path d="M12 17.5a7 7 0 010-11 7 7 0 000 11z" fill="#FF5F00"/>
                </svg>
                <span className="text-xs text-muted-foreground">Mastercard</span>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/50 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-8 h-5" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#6772E5"/>
                </svg>
                <span className="text-xs text-muted-foreground">Stripe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2024 WOI Endgame. All rights reserved. Not affiliated with the official game.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Global Servers
            </span>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Server Status: Online</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
