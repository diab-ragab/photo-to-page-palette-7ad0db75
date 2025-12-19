import { Github, Twitter, MessageCircle, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="py-8 md:py-12 px-4 border-t border-border/50">
      <div className="container">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Logo */}
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-sm">W</span>
            </div>
            <span className="font-display font-bold">WOI Endgame</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/refund" className="hover:text-primary transition-colors">Refund Policy</Link>
            <Link to="/support" className="hover:text-primary transition-colors">Support</Link>
          </div>

          {/* Social */}
          <div className="flex items-center justify-center md:justify-end gap-4">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="text-[10px] md:text-xs text-muted-foreground mr-2">We accept:</span>
          <div className="flex items-center gap-2">
            <div className="bg-muted/50 rounded px-2 py-1 flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-6 h-4" fill="currentColor">
                <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102h2.037zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.013 1.08.963 1.683 1.7 2.042.756.367 1.01.603 1.006.931-.005.503-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.375-2.566zm5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488l.233 1.12zm-2.166-2.656l1.02-2.815.588 2.815h-1.608zm-8.17-4.84l-1.603 7.496H8.34l1.605-7.496h1.925z" fill="#1A1F71"/>
              </svg>
            </div>
            <div className="bg-muted/50 rounded px-2 py-1 flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-6 h-4">
                <circle cx="7" cy="12" r="7" fill="#EB001B"/>
                <circle cx="17" cy="12" r="7" fill="#F79E1B"/>
                <path d="M12 17.5a7 7 0 010-11 7 7 0 000 11z" fill="#FF5F00"/>
              </svg>
            </div>
            <div className="bg-muted/50 rounded px-2 py-1 flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-6 h-4" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#6772E5"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="mt-6 md:mt-8 text-center text-[10px] md:text-xs text-muted-foreground">
          © 2024 WOI Endgame. All rights reserved. Not affiliated with the official game.
        </div>
      </div>
    </footer>
  );
};
