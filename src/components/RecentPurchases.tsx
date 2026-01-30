import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Purchase {
  playerName: string;
  itemName: string;
  itemIcon: string;
  timeAgo: string;
  price?: number;
}

export const RecentPurchases = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch real purchases from API
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await fetch("https://woiendgame.online/api/recent_purchases.php");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.purchases && data.purchases.length > 0) {
            setPurchases(data.purchases);
          }
        }
      } catch {
        // Silent fail - no purchases to show
      }
    };

    fetchPurchases();
    // Refresh every 2 minutes
    const refreshInterval = setInterval(fetchPurchases, 120000);
    return () => clearInterval(refreshInterval);
  }, []);

  const showNextPurchase = useCallback(() => {
    if (purchases.length === 0) return;

    const purchase = purchases[currentIndex % purchases.length];
    setCurrentPurchase(purchase);
    setIsVisible(true);
    setCurrentIndex((prev) => (prev + 1) % purchases.length);

    // Hide after 4 seconds
    setTimeout(() => setIsVisible(false), 4000);
  }, [purchases, currentIndex]);

  useEffect(() => {
    if (purchases.length === 0) return;

    // Show first purchase after 5 seconds
    const initialTimeout = setTimeout(showNextPurchase, 5000);

    // Then show every 20-30 seconds
    const interval = setInterval(() => {
      showNextPurchase();
    }, 20000 + Math.random() * 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [purchases.length, showNextPurchase]);

  // Don't render anything if no purchases
  if (purchases.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && currentPurchase && (
        <motion.div
          initial={{ opacity: 0, x: -100, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-6 left-6 z-50 max-w-xs"
        >
          <div className="glass-card p-4 flex items-center gap-3 border-primary/30 shadow-lg shadow-primary/10">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-2xl">
              {currentPurchase.itemIcon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                <span className="text-primary">{currentPurchase.playerName}</span> purchased
              </p>
              <p className="text-sm text-foreground font-semibold truncate">
                {currentPurchase.itemName}
              </p>
              <p className="text-xs text-muted-foreground">{currentPurchase.timeAgo}</p>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
