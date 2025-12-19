import { motion } from "framer-motion";
import { Users, Eye } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export const AboutSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-primary text-sm font-display uppercase tracking-widest mb-4 block">
              Who We Are
            </span>
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-6">
              Forged in Passion,
              <br />
              <span className="text-gradient">Defined by Excellence.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              WOI Endgame is a community-driven project by passionate War of the Immortals players. 
              We're not a generic private server; we're a group of longtime players who decided to 
              take the best parts of experience and shape it to modern standards.
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-center max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Our mission is to create a stable, fair, and engaging environment where all players 
            can thrive and feel supported by a team that values consistency over short-term hype. 
            We're not here to make a quick buck—we're here for the long run.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-6 max-w-xl mx-auto"
          >
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Player Focused</h3>
              <p className="text-xs text-muted-foreground">
                Community feedback drives our development. Your voice matters in shaping the future.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Long Term Vision</h3>
              <p className="text-xs text-muted-foreground">
                We're building for longevity, not short-term gains. Expect consistent updates.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
