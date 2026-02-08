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
  History
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
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ReactNode> = {
  coins: <Coins className="h-4 w-4" />,
  crown: <Crown className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  gift: <Gift className="h-4 w-4" />,
  x: <X className="h-4 w-4" />,
};

interface WheelProps {
  segments: WheelSegment[];
  spinning: boolean;
  winnerIndex: number | null;
  onSpinComplete: () => void;
}

function Wheel({ segments, spinning, winnerIndex, onSpinComplete }: WheelProps) {
  const [rotation, setRotation] = useState(0);
  
  useEffect(() => {
    if (spinning && winnerIndex !== null) {
      // Calculate target rotation
      const segmentAngle = 360 / segments.length;
      // Spin multiple times + land on winner
      const spins = 5;
      const targetAngle = 360 * spins + (360 - (winnerIndex * segmentAngle + segmentAngle / 2) - 90);
      setRotation(targetAngle);
      
      // Trigger completion after animation
      const timer = setTimeout(() => {
        onSpinComplete();
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [spinning, winnerIndex, segments.length, onSpinComplete]);

  const segmentAngle = 360 / segments.length;

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
        <div 
          className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent"
          style={{ borderTopColor: 'hsl(var(--primary))' }}
        />
      </div>
      
      {/* Wheel */}
      <motion.div
        className="w-full h-full rounded-full overflow-hidden border-4 border-primary/30 shadow-lg shadow-primary/20"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {segments.map((segment, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            
            const x1 = 50 + 50 * Math.cos(startRad);
            const y1 = 50 + 50 * Math.sin(startRad);
            const x2 = 50 + 50 * Math.cos(endRad);
            const y2 = 50 + 50 * Math.sin(endRad);
            
            const largeArc = segmentAngle > 180 ? 1 : 0;
            
            const path = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
            
            // Text position (middle of segment)
            const midAngle = (startAngle + endAngle) / 2 - 90;
            const midRad = midAngle * (Math.PI / 180);
            const textX = 50 + 32 * Math.cos(midRad);
            const textY = 50 + 32 * Math.sin(midRad);
            
            return (
              <g key={segment.id}>
                <path d={path} fill={segment.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="4"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {segment.label.length > 12 ? segment.label.slice(0, 10) + '...' : segment.label}
                </text>
              </g>
            );
          })}
          {/* Center circle */}
          <circle cx="50" cy="50" r="8" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
          <circle cx="50" cy="50" r="4" fill="hsl(var(--primary))" />
        </svg>
      </motion.div>
      
      {/* Glow effect when spinning */}
      {spinning && (
        <div className="absolute inset-0 rounded-full animate-pulse bg-primary/20 blur-xl -z-10" />
      )}
    </div>
  );
}

interface RewardPopupProps {
  result: SpinResult;
  onClose: () => void;
}

function RewardPopup({ result, onClose }: RewardPopupProps) {
  const isNothing = result.winner.reward_type === 'nothing';
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="bg-card border border-primary/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!isNothing && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: result.winner.color + '30' }}
          >
            <span className="text-4xl" style={{ color: result.winner.color }}>
              {ICON_MAP[result.winner.icon] || <Gift className="h-10 w-10" />}
            </span>
          </motion.div>
        )}
        
        <h3 className="text-2xl font-bold mb-2">
          {isNothing ? '😅 Better luck next time!' : '🎉 Congratulations!'}
        </h3>
        
        <p className="text-lg mb-4">
          {isNothing ? (
            'No reward this time'
          ) : (
            <>
              You won{' '}
              <span className="font-bold" style={{ color: result.winner.color }}>
                {result.winner.label}
              </span>
              !
            </>
          )}
        </p>
        
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
        loadData(); // Refresh status
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

  const handleSpin = async () => {
    if (spinning || !status?.can_spin) return;

    try {
      setSpinning(true);
      const spinResult = await performSpin();
      setResult(spinResult);
      setWinnerIndex(spinResult.winner_index);
    } catch (err: any) {
      toast.error(err.message || 'Failed to spin');
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
    loadData(); // Refresh status
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

  return (
    <>
      <Card className="bg-card border-primary/20 overflow-hidden">
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
          <Wheel
            segments={segments}
            spinning={spinning}
            winnerIndex={winnerIndex}
            onSpinComplete={handleSpinComplete}
          />

          {status.can_spin ? (
            <Button
              size="lg"
              onClick={handleSpin}
              disabled={spinning}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30"
            >
              <Sparkles className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
              {spinning ? 'Spinning...' : 'Spin Now!'}
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

      {/* Result Popup */}
      <AnimatePresence>
        {showResult && result && (
          <RewardPopup result={result} onClose={handleCloseResult} />
        )}
      </AnimatePresence>
    </>
  );
}
