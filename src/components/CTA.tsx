import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CTA = () => {
  return (
    <section className="py-24 px-4 bg-card/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-12 md:p-16 text-center max-w-4xl mx-auto relative overflow-hidden"
        >
          {/* Glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10" />
          
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Ready to start your journey?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Download the launcher and get a free Starter Pack containing a mount, 
            14 days of Premium, and a head start on your adventure!
          </p>
          
          <Button variant="hero" size="xl">
            <Download className="mr-2 h-5 w-5" />
            Download Launcher
          </Button>
          
          <p className="text-xs text-muted-foreground mt-6">
            Windows 10/11 • 64-bit • No installation required
          </p>
        </motion.div>
      </div>
    </section>
  );
};
