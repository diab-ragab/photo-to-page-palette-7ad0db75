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

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section id="hero" ref={sectionRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden pb-20">
      {/* Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute w-full h-full object-cover scale-110"
          poster={heroBg}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      </div>
      
      {/* Fallback Image Background */}
      <motion.div 
        className="absolute inset-0 z-[1]"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          y: backgroundY,
          opacity: 0, // Hidden when video plays, shown as fallback
        }}
      />
      
      {/* Overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background z-10"
        style={{ opacity }}
      />
      
      {/* Floating Particles */}
      <ParticleField />
      
      <div className="container relative z-20 px-4 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-display uppercase tracking-widest mb-6">
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
      </div>
    </section>
  );
};
