import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    
    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Don't show for 7 days after dismiss
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 10 seconds on the page
      setTimeout(() => setShowPrompt(true), 10000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // For iOS, show manual instructions after delay
    if (ios && !standalone) {
      setTimeout(() => setShowPrompt(true), 15000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  };

  // Don't show if already installed or shouldn't show
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">Install WOI Endgame</h3>
            
            {isIOS ? (
              <p className="text-xs text-muted-foreground mb-3">
                Tap <span className="inline-flex items-center px-1 bg-muted rounded">Share</span> then{" "}
                <span className="font-medium">"Add to Home Screen"</span> for quick access!
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">
                Get instant access to rewards, voting, and shop from your home screen!
              </p>
            )}
            
            {!isIOS && deferredPrompt && (
              <Button onClick={handleInstall} size="sm" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Install App
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
