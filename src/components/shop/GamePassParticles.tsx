import { useEffect, useRef } from "react";

/** Floating orbs behind the Game Pass section */
export const GamePassParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Orb {
      x: number; y: number; r: number; vx: number; vy: number;
      color: string; alpha: number; phase: number;
    }

    const rect = canvas.getBoundingClientRect();
    const orbs: Orb[] = Array.from({ length: 18 }, () => {
      const gold = Math.random() > 0.5;
      return {
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        r: 2 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.25,
        color: gold ? "hsla(38,90%,55%," : "hsla(270,70%,60%,",
        alpha: 0.25 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      };
    });

    let t = 0;
    const draw = () => {
      const r = canvas.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      ctx.clearRect(0, 0, w, h);
      t += 0.01;

      for (const o of orbs) {
        o.x += o.vx;
        o.y += o.vy;
        if (o.y < -10) { o.y = h + 10; o.x = Math.random() * w; }
        if (o.x < -10) o.x = w + 10;
        if (o.x > w + 10) o.x = -10;

        const flicker = 0.6 + 0.4 * Math.sin(t * 2 + o.phase);
        const a = o.alpha * flicker;

        // Glow
        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 4);
        grad.addColorStop(0, o.color + (a * 0.5) + ")");
        grad.addColorStop(1, o.color + "0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = o.color + a + ")";
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden
    />
  );
};
