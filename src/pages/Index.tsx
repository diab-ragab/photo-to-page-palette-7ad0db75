import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ClassSelection } from "@/components/ClassSelection";
import { Features } from "@/components/Features";
import { AboutSection } from "@/components/AboutSection";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { UpdateRoad } from "@/components/UpdateRoad";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <ClassSelection />
      <Features />
      <AboutSection />
      <FAQ />
      <CTA />
      <UpdateRoad />
      <Footer />
    </div>
  );
};

export default Index;
