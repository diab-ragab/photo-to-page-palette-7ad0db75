import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";

const purchaseNames = [
  "DragonSlayer99", "ShadowMage", "IceQueen", "PhoenixRider", "DarkKnight",
  "StormBringer", "MysticWolf", "CrimsonBlade", "SilverArrow", "ThunderFist"
];

const purchaseItems = [
  { name: "Dragon Wings", emoji: "🐉", price: 29.99 },
  { name: "Angel Aura Set", emoji: "👼", price: 19.99 },
  { name: "Epic Pet Egg", emoji: "🥚", price: 9.99 },
  { name: "5000 Zen", emoji: "💎", price: 19.99 },
  { name: "Phoenix Feathers", emoji: "🔥", price: 24.99 },
  { name: "Shadow Cloak", emoji: "🦇", price: 14.99 },
  { name: "Legendary Pet Egg", emoji: "🥚", price: 19.99 },
  { name: "10M Gold Coins", emoji: "🪙", price: 9.99 },
];

interface Purchase {
  id: number;
  playerName: string;
  item: typeof purchaseItems[0];
  timeAgo: string;
}

export const RecentPurchases = () => {
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showRandomPurchase = () => {
      const randomPlayer = purchaseNames[Math.floor(Math.random() * purchaseNames.length)];
      const randomItem = purchaseItems[Math.floor(Math.random() * purchaseItems.length)];
      const timeOptions = ["just now", "2 min ago", "5 min ago", "10 min ago"];
      const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];

      setCurrentPurchase({
        id: Date.now(),
        playerName: randomPlayer,
        item: randomItem,
        timeAgo: randomTime,
      });
      setIsVisible(true);

      // Hide after 4 seconds
      setTimeout(() => setIsVisible(false), 4000);
    };

    // Show first purchase after 5 seconds
    const initialTimeout = setTimeout(showRandomPurchase, 5000);

    // Then show every 15-25 seconds
    const interval = setInterval(() => {
      showRandomPurchase();
    }, 15000 + Math.random() * 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

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
              {currentPurchase.item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                <span className="text-primary">{currentPurchase.playerName}</span> purchased
              </p>
              <p className="text-sm text-foreground font-semibold truncate">
                {currentPurchase.item.name}
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
