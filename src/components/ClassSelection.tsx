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
import championImg from "@/assets/class-paladin.jpg";
import slayerImg from "@/assets/class-assassin.jpg";
import duelistImg from "@/assets/class-warlock.jpg";
import rangerImg from "@/assets/class-ranger.jpg";
import enchantressImg from "@/assets/class-monk.jpg";
import harbingerImg from "@/assets/class-necromancer.jpg";
import { ClassDetailModal, ClassData } from "@/components/ClassDetailModal";

const classes: ClassData[] = [
  {
    name: "Berzerker",
    image: berserkerImg,
    description: "Brutal force and destruction specialist",
    lore: "Excelling at the brutal force and destruction the Berzerker is always the one to charge in head first. With a strong emphasis on melee damage and mobility they make the perfect soldier. While they have an affinity for melee weapons and medium grade armor they are however lacking in magical defense. By utilizing their ability to snare and close distance the Berzerker is a natural born destroyer.",
    skills: [
      { name: "Bloodrage", description: "Enter a berserker fury, increasing damage", icon: "🔥" },
      { name: "Whirlwind", description: "Spin attack hitting all nearby enemies", icon: "🌀" },
      { name: "Charge", description: "Close distance to enemies rapidly", icon: "⚡" },
      { name: "Execution", description: "Massive damage to weakened targets", icon: "⚔️" },
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
    name: "Champion",
    image: championImg,
    description: "Heavy armor tank and battlefield controller",
    lore: "With heavy armor and strong weapons the Champion is always the focal point in every fight. As the tank, they specialize in abilities to control the battlefield by taunting their foes and strengthening their defenses. Champions are invaluable in any party as they will always be the first to engage the enemy and the last one to leave.",
    skills: [
      { name: "Taunt", description: "Force enemies to attack you", icon: "📢" },
      { name: "Shield Wall", description: "Massively increase defense temporarily", icon: "🛡️" },
      { name: "Rallying Cry", description: "Boost party morale and defense", icon: "⚔️" },
      { name: "Ground Slam", description: "Stun nearby enemies with impact", icon: "💥" },
    ],
    stats: { strength: 75, defense: 100, magic: 20, speed: 40, health: 95 },
  },
  {
    name: "Heretic",
    image: hereticImg,
    description: "Divine light and destructive darkness wielder",
    lore: "Heretics harness the divine powers of light and the destructive nature of darkness. With the combined forces, they deal a respectable amount of damage while still keeping themselves and their party members healed. With their assistance, no battle is too tough.",
    skills: [
      { name: "Divine Light", description: "Heal allies with holy energy", icon: "✨" },
      { name: "Shadow Bolt", description: "Dark magic projectile attack", icon: "🌑" },
      { name: "Purify", description: "Remove debuffs from party members", icon: "💫" },
      { name: "Resurrection", description: "Bring fallen allies back to life", icon: "☀️" },
    ],
    stats: { strength: 30, defense: 50, magic: 85, speed: 50, health: 70 },
  },
  {
    name: "Slayer",
    image: slayerImg,
    description: "Precision striker with balanced offense",
    lore: "Adept in the arts of precision and accuracy, the Slayer inflicts heavy damage in a short period of time. Through their knowledge and fighting style, they carry both a balanced physical and magical offense. Though their defenses can be somewhat lacking, their offensive capability is almost unparalleled.",
    skills: [
      { name: "Precision Strike", description: "High accuracy critical attack", icon: "🎯" },
      { name: "Shadow Step", description: "Teleport behind your target", icon: "👤" },
      { name: "Blade Dance", description: "Rapid consecutive attacks", icon: "🗡️" },
      { name: "Execute", description: "Finish off weakened enemies", icon: "⚔️" },
    ],
    stats: { strength: 85, defense: 35, magic: 45, speed: 90, health: 55 },
  },
  {
    name: "Duelist",
    image: duelistImg,
    description: "Sword and dark magic hybrid fighter",
    lore: "Trained in both the sword and the inner workings of dark magic, the Duelist is capable of dealing a high amount of damage while debuffing the enemy. By making use of the Demonic forces, the Duelist is highly versatile and difficult to isolate and kill.",
    skills: [
      { name: "Demonic Blade", description: "Infuse weapon with dark energy", icon: "🔥" },
      { name: "Curse", description: "Weaken enemy defenses", icon: "☠️" },
      { name: "Shadow Strike", description: "Dark magic enhanced attack", icon: "🌑" },
      { name: "Soul Drain", description: "Steal life force from enemies", icon: "💀" },
    ],
    stats: { strength: 70, defense: 45, magic: 70, speed: 75, health: 60 },
  },
  {
    name: "Ranger",
    image: rangerImg,
    description: "Long range tactician and strategist",
    lore: "With guile and precision, the Ranger is extremely proficient at dealing massive amounts of damage from long range. With AOE traps and skills to aid them in combat, the Ranger plays a vital role as the tactician and strategist. With their ability, a team's overall combat effectiveness will increase dramatically.",
    skills: [
      { name: "Multi-Shot", description: "Fire multiple arrows at once", icon: "🏹" },
      { name: "Trap", description: "Set AOE snares to immobilize enemies", icon: "🪤" },
      { name: "Eagle Eye", description: "Mark targets for increased damage", icon: "🦅" },
      { name: "Volley", description: "Rain arrows on an area", icon: "🎯" },
    ],
    stats: { strength: 65, defense: 40, magic: 30, speed: 85, health: 55 },
  },
  {
    name: "Enchantress",
    image: enchantressImg,
    description: "Lyre-wielding buffer and support specialist",
    lore: "Specializing in the lyre as a weapon, the Enchantress can both weave songs of courage and destruction. Her main role is to keep allies buffed and monsters debuffed. While she does not output a great deal of damage she does however buff her allies offensive and defensive capabilities making her a sought after party member.",
    skills: [
      { name: "Song of Valor", description: "Boost party attack power", icon: "🎵" },
      { name: "Lullaby", description: "Put enemies to sleep", icon: "😴" },
      { name: "War Drums", description: "Increase party movement speed", icon: "🥁" },
      { name: "Siren Call", description: "Confuse and debuff enemies", icon: "🎶" },
    ],
    stats: { strength: 25, defense: 45, magic: 80, speed: 60, health: 65 },
  },
  {
    name: "Harbinger",
    image: harbingerImg,
    description: "Soul-capturing scythe wielder",
    lore: "Capturing souls with its scythe, the Harbinger is a master of death itself. They command the forces of the afterlife, wielding their deadly scythe to harvest the souls of their enemies. Few can stand against the Harbinger's dark powers.",
    skills: [
      { name: "Soul Reap", description: "Harvest enemy souls for power", icon: "💀" },
      { name: "Death Coil", description: "Bolt of necrotic energy", icon: "🌀" },
      { name: "Summon Souls", description: "Call forth captured spirits", icon: "👻" },
      { name: "Grim Harvest", description: "Devastating scythe attack", icon: "⚰️" },
    ],
    stats: { strength: 60, defense: 50, magic: 85, speed: 55, health: 65 },
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
