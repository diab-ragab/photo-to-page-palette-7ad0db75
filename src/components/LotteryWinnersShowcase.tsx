import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Sparkles, Gem } from "lucide-react";
import { getRecentWinners, type LotteryWinner } from "@/lib/lotteryApi";

function formatZen(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];

export const LotteryWinnersShowcase = () => {
  const [winners, setWinners] = useState<LotteryWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrateIdx, setCelebrateIdx] = useState(-1);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getRecentWinners(9);
        if (res.success && res.winners && res.winners.length > 0) {
          setWinners(res.winners);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Cycle celebration highlight
  useEffect(() => {
    if (winners.length === 0) return;
    const interval = setInterval(() => {
      setCelebrateIdx((prev) => (prev + 1) % Math.min(winners.length, 3));
    }, 3000);
    return () => clearInterval(interval);
  }, [winners]);

  if (loading || winners.length === 0) return null;

  // Group by draw_date, show latest draw's winners prominently
  const latestDate = winners[0]?.draw_date;
  const latestWinners = winners.filter((w) => w.draw_date === latestDate);
  const previousWinners = winners.filter((w) => w.draw_date !== latestDate).slice(0, 6);

  return (
    <section className="py-12 md:py-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container relative z-10 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-display uppercase tracking-widest mb-4">
            <Trophy className="h-3.5 w-3.5" />
            Daily Lottery Winners
          </span>
          <h2 className="text-2xl md:text-4xl font-bold font-display mb-2">
            Today's <span className="text-gradient">Lucky Winners</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Congratulations to our latest lottery winners! Enter daily for your chance to win.
          </p>
        </motion.div>

        {/* Latest Winners - Prominent Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          <AnimatePresence>
            {latestWinners.map((winner, i) => {
              const isHighlighted = celebrateIdx === i;
              return (
                <motion.div
                  key={winner.id}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="relative group"
                >
                  {/* Celebration glow on active card */}
                  <AnimatePresence>
                    {isHighlighted && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.05 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.5 }}
                        className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 blur-md"
                      />
                    )}
                  </AnimatePresence>

                  <div
                    className={`relative glass-card p-5 text-center transition-all duration-500 ${
                      isHighlighted ? "ring-2 ring-primary/50 shadow-lg shadow-primary/10" : ""
                    }`}
                  >
                    {/* Rank badge */}
                    <div className="text-3xl mb-2">{RANK_EMOJIS[winner.rank_position - 1] || "🏅"}</div>

                    {/* Sparkle animation */}
                    {isHighlighted && (
                      <motion.div
                        className="absolute top-2 right-2"
                        animate={{ rotate: [0, 180, 360], scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                      </motion.div>
                    )}

                    {/* Winner name */}
                    <p className="font-display font-bold text-sm md:text-base mb-1 truncate">
                      {winner.username}
                    </p>

                    {/* Amount won */}
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Gem className="h-4 w-4 text-primary" />
                      <span className="text-lg md:text-xl font-bold text-primary">
                        {formatZen(winner.zen_won)}
                      </span>
                      <span className="text-xs text-muted-foreground">Zen</span>
                    </div>

                    {/* Entry amount */}
                    <p className="text-[10px] text-muted-foreground">
                      Entered with {winner.zen_entered > 0 ? `${formatZen(winner.zen_entered)} Zen` : "Free Entry"}
                    </p>

                    {/* Crown for 1st place */}
                    {winner.rank_position === 1 && (
                      <motion.div
                        className="absolute -top-3 left-1/2 -translate-x-1/2"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Crown className="h-6 w-6 text-yellow-400 drop-shadow-lg" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Previous Winners - Compact list */}
        {previousWinners.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <p className="text-xs text-muted-foreground font-display uppercase tracking-wider mb-3 text-center">
              Previous Winners
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {previousWinners.map((winner, i) => (
                <motion.div
                  key={winner.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm">{RANK_EMOJIS[winner.rank_position - 1] || "🏅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{winner.username}</p>
                    <p className="text-[10px] text-muted-foreground">{winner.draw_date}</p>
                  </div>
                  <span className="text-xs font-bold text-primary">{formatZen(winner.zen_won)}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
