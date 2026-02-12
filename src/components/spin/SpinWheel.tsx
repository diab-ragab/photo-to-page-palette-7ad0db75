import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { WheelSegment } from '@/lib/spinWheelApi';

interface SpinWheelProps {
  segments: WheelSegment[];
  spinning: boolean;
  winnerIndex: number | null;
  onSpinComplete: () => void;
}

export function SpinWheel({ segments, spinning, winnerIndex, onSpinComplete }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [glowing, setGlowing] = useState(false);
  
  const jackpotIndex = useMemo(() => {
    let maxValue = 0;
    let maxIdx = -1;
    segments.forEach((seg, idx) => {
      if (seg.reward_type !== 'nothing' && seg.reward_value > maxValue) {
        maxValue = seg.reward_value;
        maxIdx = idx;
      }
    });
    return maxIdx;
  }, [segments]);
  
  useEffect(() => {
    if (spinning && winnerIndex !== null) {
      setGlowing(true);
      const segmentAngle = 360 / segments.length;
      const spins = 6 + Math.random() * 2;
      const targetAngle = 360 * spins + (360 - (winnerIndex * segmentAngle + segmentAngle / 2) - 90);
      setRotation(targetAngle);
      
      const timer = setTimeout(() => {
        setGlowing(false);
        onSpinComplete();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [spinning, winnerIndex, segments.length, onSpinComplete]);

  const segmentAngle = 360 / segments.length;

  return (
    <div className="relative w-72 h-72 md:w-80 md:h-80 mx-auto">
      {/* Multi-layer outer glow */}
      <div 
        className={`absolute inset-[-12px] rounded-full transition-all duration-700 ${
          spinning ? 'opacity-100' : 'opacity-40'
        }`}
        style={{
          background: 'conic-gradient(from 0deg, #06b6d4, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #22c55e, #06b6d4)',
          filter: spinning ? 'blur(16px)' : 'blur(8px)',
          animation: spinning ? 'spin 3s linear infinite' : 'spin 8s linear infinite'
        }}
      />
      {/* Inner glow ring */}
      <div 
        className={`absolute inset-[-4px] rounded-full transition-all duration-500 ${
          spinning ? 'opacity-100' : 'opacity-60'
        }`}
        style={{
          background: 'conic-gradient(from 180deg, #06b6d4, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #22c55e, #06b6d4)',
          filter: 'blur(4px)',
          animation: spinning ? 'spin 2s linear infinite reverse' : 'none'
        }}
      />
      
      {/* Decorative dots around the wheel */}
      {!spinning && [...Array(24)].map((_, i) => {
        const angle = (i * 360 / 24) * (Math.PI / 180);
        const radius = 155;
        const cx = 50 + radius * Math.cos(angle);
        const cy = 50 + radius * Math.sin(angle);
        return (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary/40"
            style={{
              left: `calc(50% + ${radius * Math.cos(angle) / 160 * 50}%)`,
              top: `calc(50% + ${radius * Math.sin(angle) / 160 * 50}%)`,
              transform: 'translate(-50%, -50%)',
              animation: `pulse 2s ease-in-out ${i * 0.08}s infinite`
            }}
          />
        );
      })}
      
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
        <div className="relative">
          <div 
            className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent drop-shadow-lg"
            style={{ 
              borderTopColor: 'hsl(var(--primary))',
              filter: glowing ? 'drop-shadow(0 0 8px hsl(var(--primary)))' : 'none'
            }}
          />
          <div 
            className="absolute top-[2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[11px] border-r-[11px] border-t-[20px] border-l-transparent border-r-transparent"
            style={{ borderTopColor: 'hsl(var(--primary-foreground))' }}
          />
        </div>
      </div>
      
      {/* Wheel */}
      <motion.div
        className="w-full h-full rounded-full overflow-hidden relative"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 5s cubic-bezier(0.15, 0.8, 0.08, 1)' : 'none',
          boxShadow: glowing 
            ? '0 0 50px rgba(251, 191, 36, 0.5), 0 0 100px rgba(251, 191, 36, 0.25), inset 0 0 30px rgba(0,0,0,0.4)' 
            : '0 10px 50px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.3)'
        }}
      >
        {/* Metallic border ring */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none z-10"
          style={{
            border: '4px solid transparent',
            backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(135deg, hsl(var(--primary) / 0.6), hsl(var(--muted)), hsl(var(--primary) / 0.6))',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)'
          }}
        />
        
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            {segments.map((segment) => (
              <linearGradient 
                key={`grad-${segment.id}`} 
                id={`segment-grad-${segment.id}`}
                x1="0%" y1="0%" x2="100%" y2="100%"
              >
                <stop offset="0%" stopColor={segment.color} stopOpacity="1" />
                <stop offset="50%" stopColor={segment.color} stopOpacity="0.85" />
                <stop offset="100%" stopColor={segment.color} stopOpacity="0.65" />
              </linearGradient>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <radialGradient id="center-grad">
              <stop offset="0%" stopColor="hsl(var(--card))" />
              <stop offset="60%" stopColor="hsl(var(--muted))" />
              <stop offset="100%" stopColor="hsl(var(--background))" />
            </radialGradient>
            <linearGradient id="jackpot-shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8">
                <animate attributeName="stopOpacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.4">
                <animate attributeName="stopOpacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8">
                <animate attributeName="stopOpacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
            <linearGradient id="segment-shine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.15" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {segments.map((segment, index) => {
            const isJackpot = index === jackpotIndex;
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
            
            const midAngle = (startAngle + endAngle) / 2 - 90;
            const midRad = midAngle * (Math.PI / 180);
            const textX = 50 + 32 * Math.cos(midRad);
            const textY = 50 + 32 * Math.sin(midRad);
            const crownX = 50 + 42 * Math.cos(midRad);
            const crownY = 50 + 42 * Math.sin(midRad);
            
            return (
              <g key={segment.id}>
                <path 
                  d={path} 
                  fill={`url(#segment-grad-${segment.id})`}
                  stroke={isJackpot ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
                  strokeWidth={isJackpot ? '1.2' : '0.3'}
                />
                {isJackpot && (
                  <path d={path} fill="url(#jackpot-shimmer)" opacity="0.3" />
                )}
                <path d={path} fill="url(#segment-shine)" opacity="0.12" />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize={isJackpot ? '4.5' : '3.8'}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                  filter="url(#glow)"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                >
                  {segment.label.length > 12 ? segment.label.slice(0, 10) + '...' : segment.label}
                </text>
                {isJackpot && (
                  <text
                    x={crownX}
                    y={crownY}
                    fontSize="5"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle + 90}, ${crownX}, ${crownY})`}
                  >
                    👑
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Center hub */}
          <circle cx="50" cy="50" r="11" fill="url(#center-grad)" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="7" fill="hsl(var(--card))">
            <animate attributeName="r" values="7;7.5;7" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="50" cy="50" r="5" fill="hsl(var(--primary))">
            <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="50" cy="50" r="2.5" fill="hsl(var(--primary-foreground))" />
        </svg>
      </motion.div>
      
      {/* Spinning particle effects */}
      {spinning && (
        <>
          <div className="absolute inset-[-16px] rounded-full animate-ping bg-primary/5" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-[-25px] rounded-full animate-pulse bg-gradient-to-r from-amber-500/15 via-transparent to-cyan-500/15 blur-xl" />
          <div className="absolute inset-[-20px] rounded-full bg-gradient-to-t from-violet-500/10 via-transparent to-amber-500/10 blur-lg animate-pulse" style={{ animationDelay: '0.5s' }} />
        </>
      )}
    </div>
  );
}
