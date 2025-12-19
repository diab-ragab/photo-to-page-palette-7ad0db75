import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ClassSelection } from "@/components/ClassSelection";
import { Features } from "@/components/Features";
import { AboutSection } from "@/components/AboutSection";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { UpdateRoad } from "@/components/UpdateRoad";
import { Footer } from "@/components/Footer";
import { ConsentPopup } from "@/components/ConsentPopup";
import { VHSEffect } from "@/components/VHSEffect";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <VHSEffect />
      <Navbar />
      <HeroSection />
      <ClassSelection />
      <Features />
      <AboutSection />
      <FAQ />
      <CTA />
      <UpdateRoad />
      <Footer />
      <ConsentPopup />
    </div>
  );
};

export default Index;
