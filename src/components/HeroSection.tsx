import { motion, useScroll, useTransform } from "framer-motion";
import { Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerStatusCard } from "@/components/ServerStatusCard";
import { AnnouncementsCard } from "@/components/AnnouncementsCard";
import { ChangelogCard } from "@/components/ChangelogCard";
import { DiscordCard } from "@/components/DiscordCard";
import { ParticleField } from "@/components/ParticleField";
import { useLanguage } from "@/contexts/LanguageContext";
import heroBg from "@/assets/hero-bg.jpg";
import { useRef } from "react";

// Replace this URL with your actual game video URL
const VIDEO_URL = "https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4";

export const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { t } = useLanguage();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Multi-layer parallax transforms - different speeds create depth
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.1, 1.3]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const particleY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  return (
    <section id="hero" ref={sectionRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden pb-20">
      {/* Video Background with Parallax */}
      <motion.div 
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ y: videoY }}
      >
        <motion.video
          autoPlay
          muted
          loop
          playsInline
          className="absolute w-full h-full object-cover saturate-[1.3] contrast-[1.1]"
          style={{ scale: videoScale }}
          poster={heroBg}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </motion.video>
      </motion.div>
      
      {/* Fallback Image Background with Parallax */}
      <motion.div 
        className="absolute inset-0 z-[1]"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          y: videoY,
          scale: videoScale,
          opacity: 0, // Hidden when video plays, shown as fallback
        }}
      />
      
      {/* HDR Gradient Overlay with Vivid Colors */}
      <motion.div 
        className="absolute inset-0 z-10"
        style={{ opacity: overlayOpacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-hdr-cyan/10 via-transparent to-hdr-magenta/10" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </motion.div>
      
      {/* HDR Color Bloom Effects */}
      <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-hdr-cyan/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-hdr-purple/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-hdr-magenta/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* CRT Scanline Effect */}
      <div className="absolute inset-0 z-[25] pointer-events-none crt-overlay" />
      
      {/* Floating Particles with Parallax */}
      <motion.div style={{ y: particleY }} className="absolute inset-0 z-15">
        <ParticleField />
      </motion.div>
      
      <motion.div 
        className="container relative z-20 px-4 pt-24"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-hdr-cyan/20 to-hdr-purple/20 border border-hdr-cyan/40 text-primary text-sm font-display uppercase tracking-widest mb-6 glow-effect">
            {t('hero.badge')}
          </span>
          
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-4 leading-tight px-2">
            {t('hero.title1')}
            <br />
            <span className="text-gradient">{t('hero.title2')}</span>
          </h1>
          
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8 px-2">
            {t('hero.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
            <Button variant="hero" size="lg" className="w-full sm:w-auto">
              <Download className="mr-2 h-5 w-5" />
              {t('hero.downloadBtn')}
            </Button>
            <Button variant="heroOutline" size="lg" className="w-full sm:w-auto">
              <Users className="mr-2 h-5 w-5" />
              {t('hero.discordBtn')}
            </Button>
          </div>
        </motion.div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-5xl mx-auto mb-3 md:mb-4">
          <ServerStatusCard />
          <AnnouncementsCard />
          <ChangelogCard />
        </div>

        {/* Discord Card */}
        <div className="max-w-5xl mx-auto">
          <DiscordCard />
        </div>
      </motion.div>
    </section>
  );
};
