import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  getLotteryStatus,
  getRecentWinners,
  enterLottery,
  getMyEntries,
  type LotteryStatus,
  type LotteryWinner,
  type LotteryEntry,
} from "@/lib/lotteryApi";
import {
  Ticket,
  Trophy,
  Clock,
  Gem,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Users,
  Crown,
  Gift,
  ShieldAlert,
  Zap,
} from "lucide-react";

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatZen(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

const RANK_COLORS = [
  "from-amber-400 to-yellow-500",
  "from-slate-300 to-gray-400",
  "from-amber-600 to-orange-700",
];

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export function DailyLottery() {
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<LotteryStatus | null>(null);
  const [winners, setWinners] = useState<LotteryWinner[]>([]);
  const [myEntries, setMyEntries] = useState<LotteryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [zenInput, setZenInput] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, winnersRes] = await Promise.all([
        getLotteryStatus(),
        getRecentWinners(9),
      ]);
      setStatus(statusRes);
      if (winnersRes.success) setWinners(winnersRes.winners || []);
      if (statusRes.seconds_until_draw > 0) setCountdown(statusRes.seconds_until_draw);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyEntries = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await getMyEntries();
      if (res.success) setMyEntries(res.entries || []);
    } catch {}
  }, [isLoggedIn]);

  useEffect(() => {
    fetchData();
    fetchMyEntries();
  }, [fetchData, fetchMyEntries]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          fetchData(); // Refresh when draw time hits
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [countdown, fetchData]);

  const handleEnter = async (type: "free" | "zen") => {
    if (type === "zen" && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setEntering(true);
    setShowConfirm(false);
    try {
      const amount = type === "free" ? 0 : parseInt(zenInput) || 0;
      const result = await enterLottery(amount, type);
      if (result.success) {
        toast({ title: "🎟️ Entry Submitted!", description: result.message });
        setZenInput("");
        fetchData();
        fetchMyEntries();
      } else {
        toast({ title: "Entry Failed", description: result.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.serverMessage || err?.message || "Failed to enter lottery.",
        variant: "destructive",
      });
    } finally {
      setEntering(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-primary/20">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!status || !status.enabled) {
    return (
      <Card className="bg-card border-border/50 opacity-60">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Daily Lottery is currently disabled.</p>
        </CardContent>
      </Card>
    );
  }

  const userData = status.user;
  const minZen = status.min_entry_zen;
  const zenValue = parseInt(zenInput) || 0;
  const isValidAmount = zenValue >= minZen;
  const canEnterFree = userData ? userData.free_entries_remaining > 0 : false;
  const canEnterPaid = userData ? userData.can_enter && isValidAmount : false;

  return (
    <div className="space-y-4">
      {/* Main Lottery Card */}
      <Card className="bg-card border-primary/20 overflow-hidden relative">
        {/* Decorative gradient top bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                <Ticket className="h-5 w-5 text-primary" />
                Daily Lottery
              </CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                Enter for a chance to win {status.reward_multiplier}x your Zen!
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                status.draw_status === "open"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : status.draw_status === "completed"
                  ? "bg-green-500/10 text-green-500 border-green-500/30"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/30"
              }`}
            >
              {status.draw_status === "open" ? "Open" : status.draw_status === "completed" ? "Drawn" : "Drawing..."}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Gem className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Prize Pool</p>
              <p className="text-sm md:text-base font-bold text-primary">{formatZen(status.total_pool)}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-accent" />
              <p className="text-xs text-muted-foreground">Total Entries</p>
              <p className="text-sm md:text-base font-bold">{status.total_entries}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-amber-400" />
              <p className="text-xs text-muted-foreground">Draw In</p>
              <p className="text-sm md:text-base font-bold font-display tracking-wider">{formatCountdown(countdown)}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-400" />
              <p className="text-xs text-muted-foreground">Winners</p>
              <p className="text-sm md:text-base font-bold">3 / draw</p>
            </div>
          </div>

          {/* User Stats */}
          {isLoggedIn && userData && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Entries</span>
                <span className="font-medium">{userData.entries_today} / {userData.max_entries}</span>
              </div>
              {userData.zen_entered > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Zen Entered</span>
                  <span className="font-medium text-primary">{formatZen(userData.zen_entered)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Win Chance</span>
                <span className="font-bold text-primary">{userData.win_chance}%</span>
              </div>
              {userData.free_entries_remaining > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Gift className="h-3 w-3" /> Free Entries</span>
                  <Badge variant="secondary" className="text-xs">{userData.free_entries_remaining} left</Badge>
                </div>
              )}
              {userData.bonus_entries > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Bonus Entries</span>
                  <Badge variant="secondary" className="text-xs bg-accent/10 text-accent">{userData.bonus_entries}</Badge>
                </div>
              )}
              {userData.is_banned && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-destructive font-medium">Your account is banned from the lottery.</span>
                </div>
              )}
            </div>
          )}

          {/* Entry Form */}
          {isLoggedIn && userData && userData.can_enter && status.draw_status === "open" && (
            <div className="space-y-3">
              {/* Free Entry */}
              {canEnterFree && (
                <Button
                  onClick={() => handleEnter("free")}
                  disabled={entering}
                  className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                >
                  <Gift className="h-4 w-4" />
                  Claim Free Entry
                </Button>
              )}

              {/* Paid Entry */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Min ${minZen.toLocaleString()} Zen`}
                  value={zenInput}
                  onChange={(e) => { setZenInput(e.target.value); setShowConfirm(false); }}
                  min={minZen}
                  step={10000}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleEnter("zen")}
                  disabled={entering || !isValidAmount}
                  className="gap-2 min-w-[120px]"
                >
                  {showConfirm ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Confirm
                    </>
                  ) : (
                    <>
                      <Ticket className="h-4 w-4" />
                      Enter
                    </>
                  )}
                </Button>
              </div>

              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  <strong>No refund after entry.</strong> You are about to enter with <strong>{formatZen(zenValue)} Zen</strong>. Click "Confirm" to proceed.
                </motion.div>
              )}

              {zenValue > 0 && isValidAmount && !showConfirm && (
                <p className="text-xs text-muted-foreground text-center">
                  Potential win: <span className="text-primary font-bold">{formatZen(zenValue * status.reward_multiplier)} Zen</span>
                </p>
              )}
            </div>
          )}

          {/* My Entries */}
          {myEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Your Entries Today</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {myEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-xs p-2 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {entry.entry_type === "free" ? "🎁 Free" : entry.entry_type === "bonus" ? "⚡ Bonus" : "💰 Zen"}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="font-medium">
                      {entry.zen_amount > 0 ? `${formatZen(entry.zen_amount)} Zen` : "Free"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Winners */}
      {winners.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-yellow-400" />
              Recent Winners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                <AnimatePresence>
                  {winners.map((winner, i) => (
                    <motion.div
                      key={winner.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm bg-gradient-to-br ${RANK_COLORS[winner.rank_position - 1] || "from-muted to-muted"}`}>
                        {RANK_ICONS[winner.rank_position - 1] || `#${winner.rank_position}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{winner.username}</p>
                        <p className="text-[10px] text-muted-foreground">{winner.draw_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{formatZen(winner.zen_won)}</p>
                        <p className="text-[10px] text-muted-foreground">won</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
