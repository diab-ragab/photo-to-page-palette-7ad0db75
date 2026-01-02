import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, Download, ShoppingBag, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { CartButton } from "@/components/shop/CartButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  e.preventDefault();
  const id = href.replace("#", "");
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
};

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const navLinks = [
    { label: t('nav.home'), href: "#hero" },
    { label: t('nav.classes'), href: "#classes" },
    { label: t('nav.features'), href: "#features" },
    { label: t('nav.faq'), href: "#faq" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-sm">W</span>
            </div>
            <span className="font-display font-bold text-lg">WOI Endgame</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {isHomePage && navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/blog"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <Newspaper className="w-4 h-4" />
              Blog
            </Link>
            <Link
              to="/shop"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              {t('nav.shop')}
            </Link>
            <CartButton />
            <ThemeToggle />
            <LanguageSwitcher />
            <Button 
              variant="default" 
              size="sm"
              onClick={() => window.open('https://example.com/download/game-client.exe', '_blank')}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('nav.download')}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-foreground"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden bg-card border-b border-border"
        >
          <div className="container px-4 py-4 flex flex-col gap-4">
            {isHomePage && navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2 cursor-pointer"
                onClick={(e) => {
                  scrollToSection(e, link.href);
                  setIsOpen(false);
                }}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/blog"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              <Newspaper className="w-4 h-4" />
              Blog
            </Link>
            <Link
              to="/shop"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBag className="w-4 h-4" />
              {t('nav.shop')}
            </Link>
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => window.open('https://example.com/download/game-client.exe', '_blank')}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('nav.download')}
            </Button>
          </div>
        </motion.div>
      )}
    </nav>
  );
};
