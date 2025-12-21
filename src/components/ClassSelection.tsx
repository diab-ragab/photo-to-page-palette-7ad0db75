import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import berserkerImg from "@/assets/class-berserker.jpg";
import magusImg from "@/assets/class-magus.jpg";
import hereticImg from "@/assets/class-heretic.jpg";
import paladinImg from "@/assets/class-paladin.jpg";
import assassinImg from "@/assets/class-assassin.jpg";
import rangerImg from "@/assets/class-ranger.jpg";
import necromancerImg from "@/assets/class-necromancer.jpg";
import monkImg from "@/assets/class-monk.jpg";
import warlockImg from "@/assets/class-warlock.jpg";
import { ClassDetailModal, ClassData } from "@/components/ClassDetailModal";

const classes: ClassData[] = [
  {
    name: "Berserker",
    image: berserkerImg,
    description: "Brutal force and destruction specialist",
    lore: "Excelling at brutal force and destruction, the Berserker is always the one to charge in head first. With a strong emphasis on melee damage and mobility they make the perfect soldier. While they have an affinity for melee weapons and medium grade armor they are however lacking in magical defense. By utilizing their ability to snare and close distance the Berserker is a natural born destroyer.",
    skills: [
      { name: "Bloodrage", description: "Enter a berserker fury, increasing damage by 50%", icon: "🔥" },
      { name: "Whirlwind", description: "Spin attack hitting all nearby enemies", icon: "🌀" },
      { name: "Battle Cry", description: "Intimidate enemies, reducing their defense", icon: "📢" },
      { name: "Execution", description: "Massive damage to low health targets", icon: "⚔️" },
    ],
    stats: { strength: 95, defense: 60, magic: 15, speed: 70, health: 85 },
  },
  {
    name: "Magus",
    image: magusImg,
    description: "Master of arcane and elemental forces",
    lore: "Magi have mastered the mystical arts of both arcane and elemental forces. By harnessing these talents they create waves of devastation. From a distance, their offensive abilities are simply unmatched. They are the masters of crowd control and snaring, controlling the battlefield as they see fit. Many of the Magus powers are focused on AoE (Area of Effect) skills, which allow them to battle many opponents at a time.",
    skills: [
      { name: "Meteor Storm", description: "Rain fire from the sky on enemies", icon: "☄️" },
      { name: "Frost Nova", description: "Freeze all enemies in place", icon: "❄️" },
      { name: "Chain Lightning", description: "Lightning that jumps between targets", icon: "⚡" },
      { name: "Arcane Shield", description: "Create a magical barrier for protection", icon: "🛡️" },
    ],
    stats: { strength: 20, defense: 35, magic: 100, speed: 55, health: 50 },
  },
  {
    name: "Heretic",
    image: hereticImg,
    description: "Divine light and destructive darkness wielder",
    lore: "Heretics harness the divine powers of light and the destructive nature of darkness. With the combined forces, they deal a respectable amount of damage while still keeping themselves and their party members healed. With their assistance, no battle is too tough.",
    skills: [
      { name: "Soul Drain", description: "Steal life force from enemies", icon: "💀" },
      { name: "Dark Blessing", description: "Heal allies with shadow energy", icon: "🌑" },
      { name: "Curse of Agony", description: "Inflict spreading damage over time", icon: "☠️" },
      { name: "Resurrection", description: "Bring fallen allies back to life", icon: "✨" },
    ],
    stats: { strength: 30, defense: 45, magic: 85, speed: 50, health: 65 },
  },
  {
    name: "Paladin",
    image: paladinImg,
    description: "Holy knight blessed with divine protection",
    lore: "Champions of light and justice, Paladins are warriors blessed by the divine. Their unwavering faith grants them supernatural resilience and the power to smite evil. They serve as protectors of the innocent, their golden armor shining as a beacon of hope in the darkest battles.",
    skills: [
      { name: "Divine Shield", description: "Become immune to all damage briefly", icon: "✝️" },
      { name: "Holy Strike", description: "Blessed attack dealing bonus damage to undead", icon: "⚔️" },
      { name: "Lay on Hands", description: "Powerful healing touch for allies", icon: "🙌" },
      { name: "Consecration", description: "Sanctify ground, damaging evil creatures", icon: "☀️" },
    ],
    stats: { strength: 75, defense: 90, magic: 50, speed: 45, health: 95 },
  },
  {
    name: "Assassin",
    image: assassinImg,
    description: "Silent killer striking from the shadows",
    lore: "Masters of stealth and precision, Assassins are the unseen hand of death. Trained in ancient shadow arts, they can vanish into darkness and strike with lethal precision. Their targets rarely see them coming, and fewer still survive to tell the tale.",
    skills: [
      { name: "Shadowstep", description: "Teleport behind your target instantly", icon: "👤" },
      { name: "Backstab", description: "Critical damage when attacking from behind", icon: "🗡️" },
      { name: "Poison Blade", description: "Coat weapons with deadly toxin", icon: "🧪" },
      { name: "Vanish", description: "Become invisible to escape or reposition", icon: "💨" },
    ],
    stats: { strength: 70, defense: 30, magic: 25, speed: 100, health: 55 },
  },
  {
    name: "Ranger",
    image: rangerImg,
    description: "Expert marksman with nature's guidance",
    lore: "Guardians of the wild, Rangers are one with nature and deadly at range. They form bonds with animal companions and can track prey across any terrain. Their arrows fly true, guided by the spirits of the forest, never missing their mark.",
    skills: [
      { name: "Multi-Shot", description: "Fire multiple arrows at once", icon: "🏹" },
      { name: "Beast Companion", description: "Summon a loyal animal to fight alongside you", icon: "🐺" },
      { name: "Trap", description: "Set snares to immobilize enemies", icon: "🪤" },
      { name: "Eagle Eye", description: "Mark targets for increased critical chance", icon: "🦅" },
    ],
    stats: { strength: 55, defense: 40, magic: 35, speed: 85, health: 60 },
  },
  {
    name: "Necromancer",
    image: necromancerImg,
    description: "Commander of the undead legions",
    lore: "Masters of death itself, Necromancers command armies of the fallen. They have conquered mortality through dark rituals, their bodies neither fully alive nor dead. Where they walk, the grave follows, and the dead rise to serve their will.",
    skills: [
      { name: "Raise Dead", description: "Summon skeletal warriors to fight for you", icon: "💀" },
      { name: "Death Coil", description: "Bolt of necrotic energy that damages or heals", icon: "🌀" },
      { name: "Bone Armor", description: "Shield yourself with skeletal remains", icon: "🦴" },
      { name: "Army of the Damned", description: "Summon a massive undead horde", icon: "⚰️" },
    ],
    stats: { strength: 25, defense: 50, magic: 90, speed: 40, health: 70 },
  },
  {
    name: "Monk",
    image: monkImg,
    description: "Martial artist channeling inner chi",
    lore: "Disciples of ancient monasteries, Monks have achieved perfect harmony between body and spirit. Their chi flows like water, allowing superhuman feats of combat and healing. They need no weapons - their bodies are temples of destruction and their fists strike like thunder.",
    skills: [
      { name: "Flying Kick", description: "Leap through the air with a devastating strike", icon: "🦶" },
      { name: "Chi Burst", description: "Release inner energy in a healing wave", icon: "💫" },
      { name: "Iron Fist", description: "Channel chi for massively increased damage", icon: "👊" },
      { name: "Meditation", description: "Rapidly regenerate health and energy", icon: "🧘" },
    ],
    stats: { strength: 65, defense: 55, magic: 60, speed: 90, health: 70 },
  },
  {
    name: "Warlock",
    image: warlockImg,
    description: "Wielder of demonic pacts and hellfire",
    lore: "Those who seek power at any cost become Warlocks, forging pacts with demons and otherworldly entities. Their fel magic burns with infernal flames, and their demon servants obey without question. The price of their power is their soul, but most consider it worth paying.",
    skills: [
      { name: "Hellfire", description: "Unleash demonic flames that burn everything", icon: "🔥" },
      { name: "Summon Demon", description: "Call forth a demon servant to fight", icon: "👹" },
      { name: "Life Tap", description: "Sacrifice health to restore mana", icon: "💔" },
      { name: "Soul Siphon", description: "Drain enemy souls for power", icon: "👁️" },
    ],
    stats: { strength: 35, defense: 40, magic: 95, speed: 50, health: 60 },
  },
];

export const ClassSelection = () => {
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleClassClick = (classData: ClassData) => {
    setSelectedClass(classData);
    setIsModalOpen(true);
  };

  const scrollTo = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  return (
    <>
      <section id="classes" className="py-16 md:py-24 scroll-mt-20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-16"
          >
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold font-display mb-4">
              Choose Your Path
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
              Select from distinct classes, each with unique abilities & skills. Whether you prefer to be a 
              fierce warrior or a powerful mage, there's a class waiting for you.
            </p>
          </motion.div>
        </div>

        {/* Carousel */}
        <div className="w-full px-4 md:px-12 lg:px-20">
          <Carousel
            setApi={setApi}
            opts={{
              align: "center",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 3000,
                stopOnInteraction: true,
                stopOnMouseEnter: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {classes.map((classItem, index) => (
                <CarouselItem 
                  key={classItem.name} 
                  className="pl-2 md:pl-4 basis-[280px] md:basis-[300px] lg:basis-[320px]"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onClick={() => handleClassClick(classItem)}
                    className="group relative overflow-hidden rounded-xl cursor-pointer"
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={classItem.image}
                        alt={classItem.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold font-display mb-2 text-foreground">
                        {classItem.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {classItem.description}
                      </p>
                      <span className="inline-flex items-center text-primary text-sm font-semibold group-hover:gap-2 transition-all">
                        View Skills <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center items-center gap-4 mt-8">
              <CarouselPrevious className="static translate-y-0" />
              
              {/* Dot Indicators */}
              <div className="flex gap-2">
                {classes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      current === index 
                        ? "bg-primary w-6" 
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>
      </section>

      <ClassDetailModal
        classData={selectedClass}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
