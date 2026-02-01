import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { checkDailyZenStatus, claimDailyZen, formatCountdown } from '@/lib/dailyZenApi';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Gift, 
  Clock, 
  CheckCircle2, 
  Coins, 
  Sparkles,
  Loader2,
  AlertCircle
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

  // Fetch status on mount
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
        setCountdown(status.seconds_until_reset);
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
    if (countdown <= 0 || canClaim) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Reset is ready, refresh status
          fetchStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, canClaim, fetchStatus]);

  // Handle claim
  const handleClaim = async () => {
    if (!canClaim || claiming) return;

    try {
      setClaiming(true);
      setError(null);
      
      const result = await claimDailyZen();
      
      if (result.success) {
        setCanClaim(false);
        setHasClaimed(true);
        setShowSuccess(true);
        setCountdown(result.seconds_until_reset || 0);
        
        toast.success(`🎉 Claimed ${(result.reward_amount || rewardAmount).toLocaleString()} Zen!`);
        
        if (onClaim && result.reward_amount) {
          onClaim(result.reward_amount);
        }
        
        // Hide success animation after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
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

  if (!isLoggedIn) return null;

  return (
    <Card className="relative overflow-hidden bg-card border-primary/20">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5" />
      
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Gift className="h-5 w-5 text-yellow-500" />
          </div>
          Daily Zen Reward
        </CardTitle>
        <CardDescription>
          Claim your free Zen every day!
        </CardDescription>
      </CardHeader>
      
      <CardContent className="relative space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col gap-2 p-3 bg-muted/50 border border-border rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Coming Soon</span>
            </div>
            <p className="text-xs text-muted-foreground/80">
              Daily Zen rewards are being set up. Check back soon!
            </p>
          </div>
        ) : (
          <>
            {/* Reward amount display */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/20">
                  <Coins className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reward</p>
                  <p className="text-xl font-bold text-yellow-500">
                    {rewardAmount.toLocaleString()} Zen
                  </p>
                </div>
              </div>
              
              {hasClaimed && (
                <div className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Claimed</span>
                </div>
              )}
            </div>

            {/* Claim button or countdown */}
            <AnimatePresence mode="wait">
              {canClaim ? (
                <motion.div
                  key="claim"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    className="w-full h-12 text-lg font-bold relative overflow-hidden group"
                    onClick={handleClaim}
                    disabled={claiming}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    {claiming ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Claim Daily Zen
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : hasClaimed ? (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-xl"
                >
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Next reward in</p>
                    <p className="text-2xl font-mono font-bold text-primary">
                      {formatCountdown(countdown)}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Success animation overlay */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                    >
                      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-xl font-bold text-green-500"
                    >
                      {rewardAmount.toLocaleString()} Zen Claimed!
                    </motion.p>
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
