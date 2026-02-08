import { useState, useEffect } from 'react';
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
  
  useEffect(() => {
    if (spinning && winnerIndex !== null) {
      setGlowing(true);
      const segmentAngle = 360 / segments.length;
      const spins = 6 + Math.random() * 2; // 6-8 spins for more drama
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
    <div className="relative w-72 h-72 mx-auto">
      {/* Outer glow ring */}
      <div 
        className={`absolute inset-[-8px] rounded-full transition-all duration-500 ${
          spinning ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'conic-gradient(from 0deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #22c55e, #f59e0b)',
          filter: 'blur(12px)',
          animation: spinning ? 'pulse 1s ease-in-out infinite' : 'none'
        }}
      />
      
      {/* Pointer - larger and more prominent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
        <div 
          className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent drop-shadow-lg"
          style={{ borderTopColor: 'hsl(var(--primary))' }}
        />
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent"
          style={{ borderTopColor: 'hsl(var(--primary-foreground))' }}
        />
      </div>
      
      {/* Wheel container with shadow */}
      <motion.div
        className="w-full h-full rounded-full overflow-hidden shadow-2xl relative"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 5s cubic-bezier(0.15, 0.8, 0.08, 1)' : 'none',
          boxShadow: glowing 
            ? '0 0 40px rgba(251, 191, 36, 0.5), 0 0 80px rgba(251, 191, 36, 0.3), inset 0 0 20px rgba(0,0,0,0.3)' 
            : '0 10px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.3)'
        }}
      >
        {/* Border ring */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none z-10"
          style={{
            border: '6px solid hsl(var(--primary) / 0.4)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
          }}
        />
        
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            {/* Add gradients for each segment */}
            {segments.map((segment, index) => (
              <linearGradient 
                key={`grad-${segment.id}`} 
                id={`segment-grad-${segment.id}`}
                x1="0%" y1="0%" x2="100%" y2="100%"
              >
                <stop offset="0%" stopColor={segment.color} stopOpacity="1" />
                <stop offset="100%" stopColor={segment.color} stopOpacity="0.7" />
              </linearGradient>
            ))}
            
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
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
            
            const midAngle = (startAngle + endAngle) / 2 - 90;
            const midRad = midAngle * (Math.PI / 180);
            const textX = 50 + 32 * Math.cos(midRad);
            const textY = 50 + 32 * Math.sin(midRad);
            
            return (
              <g key={segment.id}>
                <path 
                  d={path} 
                  fill={`url(#segment-grad-${segment.id})`}
                  stroke="rgba(255,255,255,0.3)" 
                  strokeWidth="0.3" 
                />
                {/* Segment highlight */}
                <path 
                  d={path} 
                  fill="url(#segment-shine)"
                  opacity="0.1"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="4"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                  filter="url(#glow)"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                >
                  {segment.label.length > 12 ? segment.label.slice(0, 10) + '...' : segment.label}
                </text>
              </g>
            );
          })}
          
          {/* Center hub with metallic effect */}
          <circle 
            cx="50" cy="50" r="10" 
            fill="url(#center-grad)" 
            stroke="hsl(var(--primary))" 
            strokeWidth="2"
          />
          <defs>
            <radialGradient id="center-grad">
              <stop offset="0%" stopColor="hsl(var(--background))" />
              <stop offset="80%" stopColor="hsl(var(--muted))" />
              <stop offset="100%" stopColor="hsl(var(--background))" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="5" fill="hsl(var(--primary))" />
          <circle cx="50" cy="50" r="2" fill="hsl(var(--primary-foreground))" />
        </svg>
      </motion.div>
      
      {/* Particle effects when spinning */}
      {spinning && (
        <>
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/10" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-[-20px] rounded-full animate-pulse bg-gradient-to-r from-amber-500/20 via-transparent to-orange-500/20 blur-xl" />
        </>
      )}
    </div>
  );
}
