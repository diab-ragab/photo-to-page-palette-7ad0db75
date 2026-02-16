import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/apiFetch";

interface Purchase {
  playerName: string;
  itemName: string;
  itemIcon: string;
  timeAgo: string;
}

export const LiveActivityFeed = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [visibleItems, setVisibleItems] = useState<Purchase[]>([]);

  // Fetch purchases
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await fetch(`${API_BASE}/recent_purchases.php`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.purchases?.length > 0) {
            setPurchases(data.purchases);
          }
        }
      } catch {
        // silent
      }
    };
    fetchPurchases();
    const interval = setInterval(fetchPurchases, 120000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through purchases one at a time
  const [currentIndex, setCurrentIndex] = useState(0);

  const addNext = useCallback(() => {
    if (purchases.length === 0) return;
    const item = purchases[currentIndex % purchases.length];
    setVisibleItems((prev) => {
      const next = [item, ...prev].slice(0, 5);
      return next;
    });
    setCurrentIndex((i) => (i + 1) % purchases.length);
  }, [purchases, currentIndex]);

  useEffect(() => {
    if (purchases.length === 0) return;
    // Show first immediately
    addNext();
    const interval = setInterval(addNext, 6000);
    return () => clearInterval(interval);
  }, [purchases.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (purchases.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <span className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider">
            Live Activity
          </span>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden p-3 space-y-1 min-h-[60px]">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleItems.map((item, i) => (
            <motion.div
              key={`${item.playerName}-${item.itemName}-${i}`}
              layout
              initial={{ opacity: 0, x: -40, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 40, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <span className="text-lg shrink-0">{item.itemIcon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm">
                  <span className="font-semibold text-primary">{item.playerName}</span>
                  <span className="text-muted-foreground"> purchased </span>
                  <span className="font-medium text-foreground">{item.itemName}</span>
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{item.timeAgo}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};
