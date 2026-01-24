import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Gamepad2, ShoppingBag, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const [glitchText, setGlitchText] = useState("404");

  useEffect(() => {
    // Log 404 error without exposing sensitive path info in production
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  // Glitch effect for the 404 text
  useEffect(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
    let interval: NodeJS.Timeout;
    
    const startGlitch = () => {
      let iterations = 0;
      interval = setInterval(() => {
        setGlitchText(
          "404".split("").map((char, index) => {
            if (index < iterations) return "404"[index];
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
          }).join("")
        );
        iterations += 1/3;
        if (iterations >= 4) {
          clearInterval(interval);
          setGlitchText("404");
        }
      }, 50);
    };

    startGlitch();
    const glitchInterval = setInterval(startGlitch, 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(glitchInterval);
    };
  }, []);

  const quickLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/download", label: "Download", icon: Gamepad2 },
    { to: "/shop", label: "Shop", icon: ShoppingBag },
    { to: "/support", label: "Support", icon: HelpCircle },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <SEO 
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Return to WOI Endgame homepage."
        noIndex={true}
      />
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
      
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
        {/* Glitchy 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <h1 
            className="mb-2 font-orbitron text-[8rem] font-black leading-none tracking-wider text-primary md:text-[12rem]"
            style={{
              textShadow: `
                0 0 20px hsl(var(--primary) / 0.5),
                0 0 40px hsl(var(--primary) / 0.3),
                0 0 60px hsl(var(--primary) / 0.2)
              `,
            }}
          >
            {glitchText}
          </h1>
        </motion.div>

        {/* Error message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="mb-3 font-orbitron text-2xl font-bold text-foreground md:text-3xl">
            PORTAL NOT FOUND
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            The realm you seek has been lost to the void. 
            Perhaps it never existed, or dark forces have consumed it.
          </p>
        </motion.div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8"
        >
          <Button asChild size="lg" className="gap-2 font-orbitron">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Return to Safety
            </Link>
          </Button>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <p className="mb-4 text-sm text-muted-foreground">Or explore these realms:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {quickLinks.map((link) => (
              <Button
                key={link.to}
                asChild
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Link to={link.to}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Decorative skull/gaming element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 text-[20rem] text-primary"
        >
          💀
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
