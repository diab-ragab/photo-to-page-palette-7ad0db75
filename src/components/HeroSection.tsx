import { motion, useScroll, useTransform } from "framer-motion";
import { Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerStatusCard } from "@/components/ServerStatusCard";
import { AnnouncementsCard } from "@/components/AnnouncementsCard";
import { ChangelogCard } from "@/components/ChangelogCard";
import { DiscordCard } from "@/components/DiscordCard";
import { ParticleField } from "@/components/ParticleField";
import { DownloadModal } from "@/components/DownloadModal";

import { useLanguage } from "@/contexts/LanguageContext";
import heroBg from "@/assets/hero-bg.jpg";
import { useRef, useState } from "react";


export const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { t } = useLanguage();
  const [downloadOpen, setDownloadOpen] = useState(false);
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
  

  return (
    <section id="hero" ref={sectionRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden pb-20">
      {/* Static Image Background with Parallax */}
      <motion.div 
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ y: videoY }}
      >
        <motion.div
          className="absolute w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ 
            scale: videoScale,
            backgroundImage: `url(${heroBg})`,
          }}
        />
      </motion.div>
      
      {/* Gradient Overlay with Glow Effects */}
      <motion.div 
        className="absolute inset-0 z-10"
        style={{ opacity: overlayOpacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background via-background/80 to-transparent" />
        {/* Subtle glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </motion.div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 z-15">
        <ParticleField />
      </div>
      
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
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full sm:w-auto"
              onClick={() => setDownloadOpen(true)}
            >
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

      <DownloadModal open={downloadOpen} setOpen={setDownloadOpen} />
    </section>
  );
};
