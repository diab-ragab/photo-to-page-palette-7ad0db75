import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, ShoppingBag, Newspaper, LogIn, UserPlus, User, KeyRound, LogOut, ChevronDown, LayoutDashboard, ShieldAlert, Loader2 } from "lucide-react";
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { CartButton } from "@/components/shop/CartButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthModals } from "@/components/AuthModals";
import { DownloadModal } from "@/components/DownloadModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";
  const { user, isLoggedIn, isGM, gmLoading, logout } = useAuth();

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
            {isLoggedIn && (
              <Link
                to="/dashboard"
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
            {isLoggedIn && (
              <Link
                to="/shop"
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                {t('nav.shop')}
              </Link>
            )}
            {isLoggedIn && <CartButton />}
            {isLoggedIn && <NotificationsPopover />}
            <ThemeToggle />
            <LanguageSwitcher />
            
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {user?.username}
                    {isGM && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-destructive/20 text-destructive border border-destructive/30">
                        <ShieldAlert className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  <DropdownMenuItem 
                    onClick={() => navigate('/dashboard')}
                    className="cursor-pointer"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  {gmLoading ? (
                    <DropdownMenuItem disabled className="cursor-default">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking permissions...
                    </DropdownMenuItem>
                  ) : isGM && (
                    <DropdownMenuItem 
                      onClick={() => navigate('/admin')}
                      className="cursor-pointer text-destructive"
                    >
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setChangePasswordOpen(true)}
                    className="cursor-pointer"
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLoginOpen(true)}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setRegisterOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {isLoggedIn && <CartButton />}
            {isLoggedIn && <NotificationsPopover />}
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
            {isLoggedIn && (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
            {isLoggedIn && (
              <Link
                to="/shop"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                <ShoppingBag className="w-4 h-4" />
                {t('nav.shop')}
              </Link>
            )}
            
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-2 py-2 text-sm font-medium text-foreground">
                  <User className="w-4 h-4" />
                  {user?.username}
                    {isGM && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-destructive/20 text-destructive border border-destructive/30">
                        <ShieldAlert className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  {gmLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking permissions...
                    </div>
                  ) : isGM && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                )}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setChangePasswordOpen(true);
                    setIsOpen(false);
                  }}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setLoginOpen(true);
                    setIsOpen(false);
                  }}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => {
                    setRegisterOpen(true);
                    setIsOpen(false);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <AuthModals 
        loginOpen={loginOpen}
        setLoginOpen={setLoginOpen}
        registerOpen={registerOpen}
        setRegisterOpen={setRegisterOpen}
        forgotPasswordOpen={forgotPasswordOpen}
        setForgotPasswordOpen={setForgotPasswordOpen}
        changePasswordOpen={changePasswordOpen}
        setChangePasswordOpen={setChangePasswordOpen}
      />

      <DownloadModal 
        open={downloadOpen}
        setOpen={setDownloadOpen}
      />
    </nav>
  );
};
