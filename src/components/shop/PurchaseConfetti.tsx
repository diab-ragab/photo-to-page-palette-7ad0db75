import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  velocityX: number;
  velocityY: number;
  shape: "circle" | "square" | "star";
  delay: number;
}

const COLORS = [
  "hsl(175 95% 50%)",   // cyan
  "hsl(280 90% 60%)",   // purple
  "hsl(320 95% 55%)",   // magenta
  "hsl(25 100% 55%)",   // orange
  "hsl(45 95% 60%)",    // gold
  "hsl(120 70% 50%)",   // green
  "hsl(210 100% 60%)",  // blue
];

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 20,
    y: 40,
    size: 4 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    velocityX: (Math.random() - 0.5) * 200,
    velocityY: -(100 + Math.random() * 300),
    shape: (["circle", "square", "star"] as const)[Math.floor(Math.random() * 3)],
    delay: Math.random() * 0.3,
  }));
}

const StarShape = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const PurchaseConfetti = ({ trigger }: { trigger: boolean }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [burstCount, setBurstCount] = useState(0);

  const burst = useCallback(() => {
    setParticles(createParticles(60));
    setBurstCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!trigger) return;
    burst();
    // Second burst after 400ms
    const t = setTimeout(burst, 400);
    return () => clearTimeout(t);
  }, [trigger, burst]);

  // Clean up after animation
  useEffect(() => {
    if (particles.length === 0) return;
    const t = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(t);
  }, [burstCount]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]" aria-hidden="true">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={`${burstCount}-${p.id}`}
            initial={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: 1,
              scale: 0,
              rotate: 0,
            }}
            animate={{
              left: `${p.x + p.velocityX / 5}%`,
              top: `${p.y + p.velocityY / 5}%`,
              opacity: [1, 1, 0],
              scale: [0, 1.2, 0.8],
              rotate: p.rotation + 360,
              y: [0, p.velocityY, p.velocityY + 400],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2 + Math.random(),
              delay: p.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute"
            style={{ width: p.size, height: p.size }}
          >
            {p.shape === "circle" ? (
              <div
                className="w-full h-full rounded-full"
                style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }}
              />
            ) : p.shape === "star" ? (
              <StarShape size={p.size} color={p.color} />
            ) : (
              <div
                className="w-full h-full rounded-sm"
                style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Central glow flash */}
      <AnimatePresence>
        {particles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.5, 2, 3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(175 95% 50% / 0.4), transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
