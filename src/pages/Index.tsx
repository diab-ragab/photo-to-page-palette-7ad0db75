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
import { SEO } from "@/components/SEO";

const Index = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WOI Endgame",
    description: "Experience the ultimate World of Illusions private server with exclusive classes, custom content, and an active community.",
    url: typeof window !== "undefined" ? window.location.origin : "",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: typeof window !== "undefined" ? `${window.location.origin}/shop?q={search_term_string}` : "",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO 
        description="Join WOI Endgame, the best World of Illusions private server. 9 unique classes including Paladin, Necromancer & Warlock. Custom dungeons, x10 EXP rates. Free to play!"
        keywords="WOI Endgame, World of Illusions private server, best WOI server, MMORPG 2026, Paladin class, Necromancer, Warlock, Berserker, Assassin, Ranger, Magus, Monk, Heretic, custom dungeons, free MMO"
        structuredData={structuredData}
      />
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
