import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';

interface JackpotCelebrationProps {
  isVisible: boolean;
  rewardLabel: string;
  rewardColor: string;
}

export function JackpotCelebration({ isVisible, rewardLabel, rewardColor }: JackpotCelebrationProps) {
  if (!isVisible) return null;

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    rotation: Math.random() * 720 - 360,
    color: ['#fbbf24', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6'][Math.floor(Math.random() * 6)],
    size: 6 + Math.random() * 8,
  }));

  // Generate gold sparkles
  const sparkles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    delay: Math.random() * 1,
    scale: 0.5 + Math.random() * 0.5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Golden overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 1.5, times: [0, 0.3, 1] }}
        className="absolute inset-0 bg-gradient-to-b from-amber-500/30 via-transparent to-amber-500/30"
      />

      {/* Confetti rain */}
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            width: piece.size,
            height: piece.size * 0.6,
            backgroundColor: piece.color,
            borderRadius: '2px',
          }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{
            y: window.innerHeight + 50,
            rotate: piece.rotation,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'linear',
          }}
        />
      ))}

      {/* Gold sparkles */}
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, sparkle.scale, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 0.8,
            delay: sparkle.delay,
            ease: 'easeOut',
          }}
        >
          <span className="text-2xl">✨</span>
        </motion.div>
      ))}

      {/* Central jackpot banner */}
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2"
        initial={{ scale: 0, y: -100 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 10, delay: 0.2 }}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 blur-xl bg-amber-500/50 scale-150" />
          
          <div className="relative bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-8 py-4 rounded-xl shadow-2xl border-2 border-amber-300">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center justify-center gap-3"
            >
              <Crown className="h-8 w-8 text-amber-900" />
              <div className="text-center">
                <motion.p
                  className="text-2xl font-bold text-amber-900"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                >
                  JACKPOT!
                </motion.p>
                <p className="text-sm font-semibold text-amber-800">{rewardLabel}</p>
              </div>
              <Crown className="h-8 w-8 text-amber-900" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Side bursts */}
      <motion.div
        className="absolute left-0 top-1/2 -translate-y-1/2"
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="text-6xl">🎉</div>
      </motion.div>
      
      <motion.div
        className="absolute right-0 top-1/2 -translate-y-1/2"
        initial={{ x: 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="text-6xl">🎊</div>
      </motion.div>
    </div>
  );
}
