import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";

export const VHSEffect = () => {
  const [isActive, setIsActive] = useState(false);
  const { scrollY } = useScroll();
  
  // Activate VHS effect when scrolling
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const unsubscribe = scrollY.on("change", () => {
      setIsActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsActive(false), 150);
    });
    
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [scrollY]);

  const distortionIntensity = useTransform(scrollY, [0, 500], [0, 1]);

  return (
    <motion.div 
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
      style={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 0.1 }}
    >
      {/* Tracking lines */}
      <div className="vhs-tracking" />
      
      {/* Color bleeding effect */}
      <motion.div 
        className="absolute inset-0 vhs-color-bleed"
        style={{ opacity: distortionIntensity }}
      />
      
      {/* Static noise */}
      <div className="absolute inset-0 vhs-noise" />
      
      {/* Horizontal jitter bars */}
      <div className="vhs-jitter-bars" />
    </motion.div>
  );
};
