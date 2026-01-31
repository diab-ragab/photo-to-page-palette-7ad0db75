import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sword, Shield, Zap, Heart, Star, Users, Target, BookOpen } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getClassBySlug, classes } from "@/lib/classData";
import NotFound from "./NotFound";

const statIcons = {
  strength: Sword,
  defense: Shield,
  magic: Zap,
  speed: Star,
  health: Heart,
};

const statLabels = {
  strength: "Strength",
  defense: "Defense",
  magic: "Magic Power",
  speed: "Speed",
  health: "Vitality",
};

const difficultyColors = {
  Easy: "bg-green-500/20 text-green-400 border-green-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Hard: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ClassPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const classData = slug ? getClassBySlug(slug) : undefined;

  if (!classData) {
    return <NotFound />;
  }

  const otherClasses = classes.filter((c) => c.slug !== slug).slice(0, 4);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${classData.name} Class Guide - WOI Endgame`,
    description: classData.description,
    image: classData.image,
    author: {
      "@type": "Organization",
      name: "WOI Endgame",
    },
    publisher: {
      "@type": "Organization",
      name: "WOI Endgame",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": typeof window !== "undefined" ? window.location.href : "",
    },
  };

  const breadcrumbs = [
    { name: "Home", url: typeof window !== "undefined" ? window.location.origin : "" },
    { name: "Classes", url: typeof window !== "undefined" ? `${window.location.origin}/#classes` : "" },
    { name: classData.name, url: typeof window !== "undefined" ? window.location.href : "" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={`${classData.name} Class Guide - Skills, Stats & Build`}
        description={`Master the ${classData.name} class in WOI Endgame. ${classData.description}. Learn skills, stats, and builds for this ${classData.role} class.`}
        keywords={`${classData.name}, WOI Endgame ${classData.name}, ${classData.name} build, ${classData.name} skills, ${classData.name} guide, ${classData.role}, MMORPG class guide`}
        ogType="article"
        structuredData={structuredData}
        breadcrumbs={breadcrumbs}
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-end">
        <div className="absolute inset-0">
          <img
            src={classData.image}
            alt={`${classData.name} class artwork`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        </div>

        <div className="container relative z-10 px-4 pb-12 pt-32">
          <Link to="/#classes">
            <Button variant="ghost" size="sm" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Classes
            </Button>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge variant="outline" className="text-primary border-primary">
                <Target className="h-3 w-3 mr-1" />
                {classData.role}
              </Badge>
              <Badge variant="outline" className={difficultyColors[classData.difficulty]}>
                {classData.difficulty} Difficulty
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold font-display mb-4">
              {classData.name}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              {classData.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Lore Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold font-display mb-4 flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  Lore & Background
                </h2>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <p className="text-muted-foreground leading-relaxed">
                    {classData.lore}
                  </p>
                </div>
              </motion.div>

              {/* Skills Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold font-display mb-4 flex items-center gap-2">
                  <Zap className="h-6 w-6 text-primary" />
                  Skills & Abilities
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {classData.skills.map((skill, index) => (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="text-3xl">{skill.icon}</div>
                      <div>
                        <h3 className="font-semibold mb-1">{skill.name}</h3>
                        <p className="text-sm text-muted-foreground">{skill.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Stats Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-xl bg-card border border-border sticky top-24"
              >
                <h3 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Class Stats
                </h3>
                <div className="space-y-4">
                  {Object.entries(classData.stats).map(([stat, value]) => {
                    const Icon = statIcons[stat as keyof typeof statIcons];
                    const label = statLabels[stat as keyof typeof statLabels];
                    return (
                      <div key={stat} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{value}/100</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8">
                  <Link to="/download">
                    <Button variant="hero" size="lg" className="w-full">
                      Play as {classData.name}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Classes */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4">
          <h2 className="text-2xl font-bold font-display mb-8 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Explore Other Classes
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {otherClasses.map((otherClass) => (
              <Link key={otherClass.slug} to={`/class/${otherClass.slug}`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative h-48 rounded-xl overflow-hidden group"
                >
                  <img
                    src={otherClass.image}
                    alt={otherClass.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-lg font-bold font-display">{otherClass.name}</h3>
                    <p className="text-sm text-muted-foreground">{otherClass.role}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ClassPage;
