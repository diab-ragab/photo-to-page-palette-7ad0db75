import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { checkDailyZenStatus, claimDailyZen, formatCountdown } from '@/lib/dailyZenApi';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Clock, 
  CheckCircle2, 
  Coins, 
  Sparkles,
  Loader2,
  AlertCircle,
  Zap,
  Timer,
  ShieldAlert,
  Ban
} from 'lucide-react';

interface DailyZenRewardProps {
  onClaim?: (amount: number) => void;
}

export const DailyZenReward = ({ onClaim }: DailyZenRewardProps) => {
  const { isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ban state
  const [isBanned, setIsBanned] = useState(false);
  const [permBan, setPermBan] = useState(false);
  const [banSecondsRemaining, setBanSecondsRemaining] = useState(0);
  const [strikeCount, setStrikeCount] = useState(0);
  
  const countdownEndTimeRef = useRef<number>(0);
  const banEndTimeRef = useRef<number>(0);

  const applyBanState = (data: { is_banned?: boolean; perm_ban?: boolean; ban_seconds_remaining?: number; strike_count?: number }) => {
    setIsBanned(!!data.is_banned);
    setPermBan(!!data.perm_ban);
    setStrikeCount(data.strike_count || 0);
    const banSecs = data.ban_seconds_remaining || 0;
    setBanSecondsRemaining(banSecs);
    banEndTimeRef.current = banSecs > 0 ? Date.now() + (banSecs * 1000) : 0;
  };

  const fetchStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const status = await checkDailyZenStatus();
      
      if (status.success) {
        setCanClaim(status.can_claim);
        setHasClaimed(status.has_claimed);
        setRewardAmount(status.reward_amount);
        
        const serverSeconds = status.seconds_until_next_claim;
        setCountdown(serverSeconds);
        countdownEndTimeRef.current = serverSeconds > 0 ? Date.now() + (serverSeconds * 1000) : 0;

        applyBanState(status);
        
        if (status.csrf_token) {
          sessionStorage.setItem('csrf_token', status.csrf_token);
        }
      } else {
        setError(status.error || 'Failed to check status');
      }
    } catch {
      setError('Failed to load daily reward status');
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Countdown timer
  useEffect(() => {
    if (canClaim && !isBanned) return;
    if (countdownEndTimeRef.current === 0 && countdown <= 0 && banEndTimeRef.current === 0) return;

    if (countdownEndTimeRef.current === 0 && countdown > 0) {
      countdownEndTimeRef.current = Date.now() + (countdown * 1000);
    }

    const timer = setInterval(() => {
      // Update cooldown countdown
      if (countdownEndTimeRef.current > 0) {
        const remaining = Math.max(0, Math.floor((countdownEndTimeRef.current - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          countdownEndTimeRef.current = 0;
          fetchStatus();
        }
      }
      // Update ban countdown
      if (banEndTimeRef.current > 0 && !permBan) {
        const banRemaining = Math.max(0, Math.floor((banEndTimeRef.current - Date.now()) / 1000));
        setBanSecondsRemaining(banRemaining);
        if (banRemaining <= 0) {
          banEndTimeRef.current = 0;
          fetchStatus();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [canClaim, countdown, isBanned, permBan, fetchStatus]);

  const handleClaim = async () => {
    if (!canClaim || claiming || isBanned) return;

    try {
      setClaiming(true);
      setError(null);
      
      const result = await claimDailyZen();
      
      if (result.success) {
        setCanClaim(false);
        setHasClaimed(true);
        setShowSuccess(true);
        
        const serverSeconds = result.seconds_until_next_claim || 86400;
        setCountdown(serverSeconds);
        countdownEndTimeRef.current = Date.now() + (serverSeconds * 1000);
        
        toast.success(`🎉 Claimed ${(result.reward_amount || rewardAmount).toLocaleString()} Zen!`);
        
        if (onClaim && result.reward_amount) {
          onClaim(result.reward_amount);
        }
        
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        // Check if banned from claim response
        if (result.is_banned) {
          applyBanState(result);
        }
        setError(result.error || 'Failed to claim reward');
        toast.error(result.error || 'Failed to claim reward');
      }
    } catch {
      setError('Failed to claim reward. Please try again.');
      toast.error('Failed to claim reward. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const progressPercent = countdown > 0 ? ((86400 - countdown) / 86400) * 100 : 100;

  const formatBanCountdown = (secs: number): string => {
    if (secs <= 0) return '0d 0h';
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (!isLoggedIn) return null;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-cyan-950/20 border-cyan-500/30 shadow-lg shadow-cyan-500/5">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
      
      {/* Floating particles when claimable */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {canClaim && !isBanned && (
          <>
            <motion.div className="absolute w-2 h-2 bg-cyan-400/60 rounded-full"
              animate={{ y: [100, -20], x: [20, 40], opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0 }} />
            <motion.div className="absolute w-1.5 h-1.5 bg-purple-400/60 rounded-full"
              animate={{ y: [120, -10], x: [80, 60], opacity: [0, 1, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
            <motion.div className="absolute w-1 h-1 bg-yellow-400/60 rounded-full"
              animate={{ y: [90, -30], x: [150, 130], opacity: [0, 1, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, delay: 1 }} />
          </>
        )}
      </div>
      
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-3 text-lg">
          <motion.div 
            className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30"
            animate={canClaim && !isBanned ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="h-5 w-5 text-cyan-400" />
          </motion.div>
          <div>
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-bold">
              Daily Zen Reward
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Timer className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-normal">24h Cooldown</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative space-y-4 pt-2">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : error && !isBanned ? (
          <div className="flex flex-col gap-2 p-4 bg-muted/30 border border-border/50 rounded-xl">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium">Coming Soon</span>
            </div>
            <p className="text-xs text-muted-foreground/80">
              Daily Zen rewards are being set up. Check back soon!
            </p>
          </div>
        ) : isBanned ? (
          /* ───── Banned state ───── */
          <div className="flex flex-col gap-3 p-4 bg-red-950/30 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              <span className="text-sm font-bold text-red-400">
                {permBan ? 'Permanently Banned' : 'Temporarily Banned'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {permBan
                ? 'Your account is permanently banned from Free Zen due to abuse violations.'
                : `You are banned from Free Zen for ${formatBanCountdown(banSecondsRemaining)}.`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-400">
                Strikes: {strikeCount}/3 {strikeCount >= 3 ? '(max)' : ''}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Reward amount display */}
            <motion.div 
              className="relative p-4 rounded-xl border overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                borderColor: canClaim ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.2)',
              }}
              animate={canClaim ? { borderColor: ['rgba(6, 182, 212, 0.4)', 'rgba(168, 85, 247, 0.4)', 'rgba(6, 182, 212, 0.4)'] } : {}}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {!canClaim && countdown > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-2.5 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30"
                    animate={canClaim ? { rotate: [0, 360] } : {}}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Coins className="h-6 w-6 text-cyan-400" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Reward</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      {rewardAmount.toLocaleString()} <span className="text-lg">Zen</span>
                    </p>
                  </div>
                </div>
                
                {hasClaimed && !canClaim && (
                  <motion.div 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-medium text-green-400">Claimed</span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Claim button or countdown */}
            <AnimatePresence mode="wait">
              {canClaim ? (
                <motion.div key="claim" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Button
                    className="w-full h-14 text-lg font-bold relative overflow-hidden bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 border-0 shadow-lg shadow-cyan-500/25"
                    onClick={handleClaim}
                    disabled={claiming}
                  >
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    />
                    {claiming ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Claiming...</>
                    ) : (
                      <><Sparkles className="h-5 w-5 mr-2" />Claim Daily Zen</>
                    )}
                  </Button>
                </motion.div>
              ) : hasClaimed || countdown > 0 ? (
                <motion.div key="countdown" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50"
                >
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
                    <Clock className="h-6 w-6 text-cyan-400" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next reward in</p>
                    <p className="text-3xl font-mono font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      {formatCountdown(countdown)}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Success animation overlay */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-md rounded-lg z-10"
                >
                  <div className="text-center">
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.5 }}>
                      <div className="relative">
                        <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto" />
                        <motion.div className="absolute inset-0" animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                          <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto" />
                        </motion.div>
                      </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4">
                      <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                        +{rewardAmount.toLocaleString()} Zen
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Added to your account!</p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </CardContent>
    </Card>
  );
};
