import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    description: "Melee powerhouse with devastating damage",
    lore: "Born from the ancient tribes of the Frozen North, Berserkers channel primal fury into devastating combat prowess. Their rage is legendary, allowing them to shrug off wounds that would fell lesser warriors. In battle, they become unstoppable forces of destruction, their axes cleaving through enemy ranks like wheat before a scythe.",
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
    description: "Master of arcane magic and elemental fury",
    lore: "The Magi are scholars who have unlocked the secrets of the arcane arts through decades of study in ancient towers. They command the elements themselves - fire, ice, and lightning bend to their will. Though physically frail, their devastating magical attacks can reshape battlefields in an instant.",
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
    description: "Dark priest wielding forbidden powers",
    lore: "Once devoted clerics, Heretics have turned from the light to embrace forbidden knowledge. They wield both healing and corruption, walking the razor's edge between life and death. Their dark prayers can save allies or doom enemies, making them unpredictable and feared.",
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6 },
  },
};

export const ClassSelection = () => {
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleClassClick = (classData: ClassData) => {
    setSelectedClass(classData);
    setIsModalOpen(true);
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <section id="classes" className="py-16 md:py-24 px-4 scroll-mt-20">
        <div className="container">
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

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-4 mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              className="rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              className="rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Container */}
          <div className="relative -mx-4 md:-mx-8 lg:-mx-16">
            <motion.div
              ref={scrollContainerRef}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory px-[calc(50vw-140px)] md:px-[calc(50vw-150px)]"
            >
              {classes.map((classItem) => (
                <motion.div
                  key={classItem.name}
                  variants={itemVariants}
                  onClick={() => handleClassClick(classItem)}
                  className="group relative overflow-hidden rounded-xl cursor-pointer flex-shrink-0 w-[280px] md:w-[300px] snap-center"
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
              ))}
            </motion.div>
          </div>
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
