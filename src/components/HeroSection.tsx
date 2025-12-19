import { motion } from "framer-motion";
import { Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscordWidget } from "@/components/DiscordWidget";
import heroBg from "@/assets/hero-bg.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pb-32">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background z-10" />
      
      <div className="container relative z-20 px-4 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-display uppercase tracking-widest mb-6">
            Private Server
          </span>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-4 leading-tight">
            Relive the Legend.
            <br />
            <span className="text-gradient">Dominate the Endgame.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The ultimate War of the Immortals private server experience. High rates, 
            custom dungeons, and a thriving community waiting for your arrival.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl">
              <Download className="mr-2 h-5 w-5" />
              Download Launcher
            </Button>
            <Button variant="heroOutline" size="xl">
              <Users className="mr-2 h-5 w-5" />
              Join Discord
            </Button>
          </div>
        </motion.div>

        {/* Discord & Announcements Widgets */}
        <DiscordWidget />
      </div>
    </section>
  );
};
