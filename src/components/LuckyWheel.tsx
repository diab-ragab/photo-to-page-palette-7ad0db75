import { useState, useEffect, useCallback } from 'react';
import { hapticSuccess } from '@/hooks/useHapticFeedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard, ApiErrorState } from '@/components/ui/api-loading-state';
import { 
  Sparkles, 
  Clock, 
  Coins, 
  Crown, 
  Zap, 
  Gift,
  X,
  History,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchWheelSegments, 
  fetchSpinStatus, 
  performSpin,
  type WheelSegment,
  type SpinStatus,
  type SpinResult
} from '@/lib/spinWheelApi';
import { SpinCharacterSelector } from '@/components/spin/SpinCharacterSelector';
import { SpinWheel } from '@/components/spin/SpinWheel';
import { SpinLeaderboard } from '@/components/spin/SpinLeaderboard';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ReactNode> = {
  coins: <Coins className="h-4 w-4" />,
  crown: <Crown className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  gift: <Gift className="h-4 w-4" />,
  x: <X className="h-4 w-4" />,
};

interface RewardPopupProps {
  result: SpinResult;
  characterName: string;
  onClose: () => void;
}

function RewardPopup({ result, characterName, onClose }: RewardPopupProps) {
  const isNothing = result.winner?.reward_type === 'nothing';
  const rewardType = result.winner?.reward_type;
  const isMailReward = rewardType === 'coins' || rewardType === 'zen';
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="bg-card border border-primary/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti effect for wins */}
        {!isNothing && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: '-10%'
                }}
                animate={{
                  y: ['0%', '500%'],
                  x: [0, (Math.random() - 0.5) * 100],
                  rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                  opacity: [1, 0]
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.5,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>
        )}
        
        {!isNothing && result.winner && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: (result.winner.color || '#3b82f6') + '30' }}
          >
            <span className="text-4xl" style={{ color: result.winner.color || '#3b82f6' }}>
              {ICON_MAP[result.winner.icon || 'gift'] || <Gift className="h-10 w-10" />}
            </span>
          </motion.div>
        )}
        
        <motion.h3 
          className="text-2xl font-bold mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isNothing ? '😅 Better luck next time!' : '🎉 Congratulations!'}
        </motion.h3>
        
        <motion.p 
          className="text-lg mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {isNothing || !result.winner ? (
            'No reward this time'
          ) : (
            <>
              You won{' '}
              <span className="font-bold" style={{ color: result.winner.color || '#3b82f6' }}>
                {result.winner.label || 'a prize'}
              </span>
              !
            </>
          )}
        </motion.p>

        {/* Mail delivery notice for coins/zen */}
        {!isNothing && isMailReward && result.reward_given && (
          <motion.p 
            className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Gift className="h-4 w-4" />
            Sent via in-game mail to <span className="font-medium text-foreground">{characterName}</span>
          </motion.p>
        )}

        {/* VIP points notice */}
        {!isNothing && rewardType === 'vip' && result.reward_given && (
          <motion.p 
            className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Crown className="h-4 w-4" />
            VIP points added to your account
          </motion.p>
        )}
        
        {result.spins_remaining > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            You have {result.spins_remaining} spin{result.spins_remaining !== 1 ? 's' : ''} remaining
          </p>
        )}
        
        <Button onClick={onClose} className="w-full">
          {result.spins_remaining > 0 ? 'Spin Again' : 'Awesome!'}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export function LuckyWheel() {
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState('');
  
  // Character selection state
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(false);
    try {
      const [segs, stat] = await Promise.all([
        fetchWheelSegments(),
        fetchSpinStatus()
      ]);
      setSegments(segs);
      setStatus(stat);
    } catch (err) {
      console.error('Failed to load wheel data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Countdown timer
  useEffect(() => {
    if (!status?.next_spin_at || status.can_spin) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const next = new Date(status.next_spin_at!).getTime();
      const now = Date.now();
      const diff = next - now;

      if (diff <= 0) {
        setCountdown('');
        loadData();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [status, loadData]);

  const handleCharacterSelect = (roleId: number | null, name: string | null) => {
    setSelectedRoleId(roleId);
    setSelectedCharacterName(name);
  };

  const handleSpin = async () => {
    console.log('[LuckyWheel] handleSpin called', { spinning, can_spin: status?.can_spin, selectedRoleId });
    
    if (spinning) {
      console.log('[LuckyWheel] Already spinning, ignoring');
      return;
    }
    
    if (!status?.can_spin) {
      console.log('[LuckyWheel] Cannot spin - status.can_spin is false', status);
      toast.error('Cannot spin right now. Please try again later.');
      return;
    }
    
    if (!selectedRoleId) {
      console.log('[LuckyWheel] No character selected');
      toast.error('Please select a character first');
      return;
    }

    try {
      console.log('[LuckyWheel] Starting spin with roleId:', selectedRoleId);
      setSpinning(true);
      const spinResult = await performSpin(selectedRoleId);
      console.log('[LuckyWheel] Spin result:', spinResult);
      setResult(spinResult);
      setWinnerIndex(spinResult.winner_index);
    } catch (err: any) {
      console.error('[LuckyWheel] Spin error:', err);

      const statusCode = typeof err?.status === 'number' ? err.status : undefined;
      const serverJson = err?.serverJson || {};
      const rid = typeof serverJson.rid === 'string' ? serverJson.rid : undefined;
      const debugInfo = typeof serverJson._debug === 'string' ? serverJson._debug : undefined;

      const rawMessage = (typeof err?.serverMessage === 'string' && err.serverMessage.trim() !== '')
        ? err.serverMessage
        : (err?.message || 'Failed to spin');

      let message = rawMessage;
      if (debugInfo && debugInfo !== rawMessage) {
        message += ` — ${debugInfo}`;
      }
      if (statusCode) {
        message += ` (HTTP ${statusCode})`;
      }
      if (rid) {
        message += ` (RID: ${rid})`;
      }

      console.error('[LuckyWheel] Error details:', { statusCode, rid, debugInfo, rawMessage, serverJson });

      // Handle specific backend errors
      if (rawMessage.includes('Invalid character') || rawMessage.includes('role_id') || (debugInfo && debugInfo.includes('role'))) {
        toast.error('Invalid character selection. Please choose again.');
        setSelectedRoleId(null);
        setSelectedCharacterName(null);
        localStorage.removeItem('spin_selected_role_id');
      } else {
        toast.error(message);
      }

      setSpinning(false);
    }
  };

  const handleSpinComplete = () => {
    setSpinning(false);
    setShowResult(true);
    hapticSuccess();
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResult(null);
    setWinnerIndex(null);
    loadData();
  };

  if (loading) {
    return <SkeletonCard rows={4} className="border-primary/20" />;
  }

  if (error) {
    return (
      <ApiErrorState
        variant="card"
        message="Failed to load the spin wheel."
        onRetry={loadData}
      />
    );
  }

  if (!status?.enabled) {
    return (
      <Card className="bg-card border-primary/20">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Spin wheel is currently disabled</p>
        </CardContent>
      </Card>
    );
  }

  if (segments.length < 2) {
    return (
      <Card className="bg-card border-primary/20">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Wheel not configured yet</p>
        </CardContent>
      </Card>
    );
  }

  const canSpinNow = status.can_spin && selectedRoleId !== null && !spinning;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Wheel Card */}
        <Card className="bg-card border-primary/20 overflow-hidden lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Lucky Spin
              </CardTitle>
              <Badge variant="outline" className="gap-1">
                <History className="h-3 w-3" />
                {status.spins_remaining}/{status.spins_per_day} spins
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 flex flex-col items-center gap-6">
            {/* Character Selector */}
            <div className="w-full max-w-xs">
              <SpinCharacterSelector
                onSelect={handleCharacterSelect}
                selectedRoleId={selectedRoleId}
              />
            </div>

            <SpinWheel
              segments={segments}
              spinning={spinning}
              winnerIndex={winnerIndex}
              onSpinComplete={handleSpinComplete}
            />

            {/* Reward receiver label */}
            {selectedCharacterName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Reward receiver: <span className="font-medium text-foreground">{selectedCharacterName}</span></span>
              </div>
            )}

            {status.can_spin ? (
              <Button
                size="lg"
                onClick={handleSpin}
                disabled={!canSpinNow}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 disabled:opacity-50"
              >
                <Sparkles className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
                {spinning ? 'Spinning...' : !selectedRoleId ? 'Select Character' : 'Spin Now!'}
              </Button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Next spin available in:</p>
                <div className="flex items-center gap-2 justify-center text-lg font-mono font-bold text-primary">
                  <Clock className="h-5 w-5" />
                  {countdown || 'Loading...'}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="w-full pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">Possible Rewards</p>
              <div className="flex flex-wrap justify-center gap-2">
                {segments.slice(0, 6).map((seg) => (
                  <Badge
                    key={seg.id}
                    variant="outline"
                    className="gap-1 text-xs"
                    style={{ borderColor: seg.color, color: seg.color }}
                  >
                    {ICON_MAP[seg.icon] || <Gift className="h-3 w-3" />}
                    {seg.label}
                  </Badge>
                ))}
                {segments.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{segments.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <SpinLeaderboard />
        </div>
      </div>

      {/* Result Popup */}
      <AnimatePresence>
        {showResult && result && result.winner && (
          <RewardPopup 
            result={result} 
            characterName={selectedCharacterName || 'your character'} 
            onClose={handleCloseResult} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
