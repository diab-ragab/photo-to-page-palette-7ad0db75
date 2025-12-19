import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ServerStats } from "@/components/ServerStats";
import { ClassSelection } from "@/components/ClassSelection";
import { Features } from "@/components/Features";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <ServerStats />
      <ClassSelection />
      <Features />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
