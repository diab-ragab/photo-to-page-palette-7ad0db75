import { motion } from "framer-motion";
import { Users, Eye } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export const AboutSection = () => {
  return (
    <section className="py-16 md:py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-10" />

      <div className="container relative z-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-8 md:mb-12"
          >
            <span className="text-primary text-xs md:text-sm font-display uppercase tracking-widest mb-4 block">
              Who We Are
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold font-display mb-4 md:mb-6 px-2">
              Forged in Passion,
              <br />
              <span className="text-gradient">Defined by Excellence.</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
              WOI Endgame is a community-driven project by passionate War of the Immortals players. 
              Experience 9 unique classes including the brutal Berserker, the arcane Magus, and the 
              divine Heretic. We bring the best parts of WOI to modern standards with classes, 
              monsters, quests, items, pets, and more.
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-sm md:text-base text-muted-foreground text-center max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed px-2"
          >
            Our mission is to create a stable, fair, and engaging environment where all players 
            can thrive and feel supported by a team that values consistency over short-term hype. 
            We're not here to make a quick buck—we're here for the long run.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-2 gap-3 md:gap-6 max-w-xl mx-auto"
          >
            <div className="glass-card p-4 md:p-6 text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-sm md:text-lg mb-1 md:mb-2">Player Focused</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Community feedback drives our development.
              </p>
            </div>
            <div className="glass-card p-4 md:p-6 text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Eye className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-sm md:text-lg mb-1 md:mb-2">Long Term Vision</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Building for longevity, not short-term gains.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
