import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const particleCount = 80;
    const particles: Particle[] = [];
    const mouseRadius = 150;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3 - 0.2,
        opacity: Math.random() * 0.5 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    let animationId: number;
    let time = 0;

    const connectionRadius = 120;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 1;

      const mouse = mouseRef.current;

      particles.forEach((particle) => {
        // Update base position (drifting)
        particle.baseX += particle.speedX;
        particle.baseY += particle.speedY;

        // Wrap around edges
        if (particle.baseX < 0) particle.baseX = canvas.width;
        if (particle.baseX > canvas.width) particle.baseX = 0;
        if (particle.baseY < 0) particle.baseY = canvas.height;
        if (particle.baseY > canvas.height) particle.baseY = 0;

        // Calculate mouse interaction
        const dx = mouse.x - particle.baseX;
        const dy = mouse.y - particle.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouseRadius && distance > 0) {
          const force = (mouseRadius - distance) / mouseRadius;
          const angle = Math.atan2(dy, dx);
          const pushX = Math.cos(angle) * force * 30;
          const pushY = Math.sin(angle) * force * 30;
          particle.x = particle.baseX - pushX;
          particle.y = particle.baseY - pushY;
        } else {
          // Smoothly return to base position
          particle.x += (particle.baseX - particle.x) * 0.1;
          particle.y += (particle.baseY - particle.y) * 0.1;
        }
      });

      // Draw connection lines between nearby particles when mouse is close
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        const mouseDistP1 = Math.sqrt(
          Math.pow(mouse.x - p1.x, 2) + Math.pow(mouse.y - p1.y, 2)
        );

        if (mouseDistP1 < mouseRadius * 1.5) {
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dist = Math.sqrt(
              Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
            );

            if (dist < connectionRadius) {
              const mouseDistP2 = Math.sqrt(
                Math.pow(mouse.x - p2.x, 2) + Math.pow(mouse.y - p2.y, 2)
              );
              const avgMouseDist = (mouseDistP1 + mouseDistP2) / 2;
              const mouseProximity = Math.max(0, 1 - avgMouseDist / (mouseRadius * 1.5));
              const distOpacity = 1 - dist / connectionRadius;
              const lineOpacity = distOpacity * mouseProximity * 0.4;

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(74, 222, 128, ${lineOpacity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      // Draw particles
      particles.forEach((particle) => {
        // Twinkle effect
        const twinkle = Math.sin(time * particle.twinkleSpeed + particle.twinkleOffset);
        const currentOpacity = particle.opacity * (0.5 + twinkle * 0.5);

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 3
        );
        gradient.addColorStop(0, `rgba(74, 222, 128, ${currentOpacity})`);
        gradient.addColorStop(0.5, `rgba(74, 222, 128, ${currentOpacity * 0.3})`);
        gradient.addColorStop(1, "rgba(74, 222, 128, 0)");

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core of the star
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-[5]"
      style={{ pointerEvents: "auto" }}
    />
  );
};
