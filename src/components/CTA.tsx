import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DownloadModal } from "@/components/DownloadModal";

export const CTA = () => {
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <section className="py-16 md:py-24 px-4 bg-card/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="glass-card p-8 md:p-12 lg:p-16 text-center max-w-4xl mx-auto relative overflow-hidden"
        >
          {/* Glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 md:w-96 h-64 md:h-96 bg-primary/20 rounded-full blur-3xl -z-10" />
          
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold font-display mb-4">
            Ready to start your journey?
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-6 md:mb-8 px-2">
            Download the launcher and get a free Starter Pack containing a mount, 
            14 days of Premium, and a head start on your adventure!
          </p>
          
          <Button 
            variant="hero" 
            size="lg" 
            className="w-full sm:w-auto"
            onClick={() => setDownloadOpen(true)}
          >
            <Download className="mr-2 h-5 w-5" />
            Download Game Client
          </Button>
          
          <p className="text-[10px] md:text-xs text-muted-foreground mt-4 md:mt-6">
            Windows 10/11 • 64-bit • No installation required
          </p>
        </motion.div>
      </div>

      <DownloadModal open={downloadOpen} setOpen={setDownloadOpen} />
    </section>
  );
};
