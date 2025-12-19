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
        description="Experience the ultimate World of Illusions private server. Join WOI Endgame for 9 exclusive classes, custom content, active community, and regular updates."
        keywords="WOI Endgame, World of Illusions, private server, MMORPG, gaming, RPG, fantasy game, online game, Paladin, Necromancer, Warlock"
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
