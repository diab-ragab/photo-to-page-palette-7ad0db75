import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import berserkerImg from "@/assets/class-berserker.jpg";
import magusImg from "@/assets/class-magus.jpg";
import hereticImg from "@/assets/class-heretic.jpg";
import paladinImg from "@/assets/class-paladin.jpg";
import assassinImg from "@/assets/class-assassin.jpg";
import rangerImg from "@/assets/class-ranger.jpg";
import necromancerImg from "@/assets/class-necromancer.jpg";
import monkImg from "@/assets/class-monk.jpg";
import warlockImg from "@/assets/class-warlock.jpg";

const classes = [
  {
    name: "Berserker",
    image: berserkerImg,
    description: "Melee powerhouse with devastating damage",
  },
  {
    name: "Magus",
    image: magusImg,
    description: "Master of arcane magic and elemental fury",
  },
  {
    name: "Heretic",
    image: hereticImg,
    description: "Dark priest wielding forbidden powers",
  },
  {
    name: "Paladin",
    image: paladinImg,
    description: "Holy knight blessed with divine protection",
  },
  {
    name: "Assassin",
    image: assassinImg,
    description: "Silent killer striking from the shadows",
  },
  {
    name: "Ranger",
    image: rangerImg,
    description: "Expert marksman with nature's guidance",
  },
  {
    name: "Necromancer",
    image: necromancerImg,
    description: "Commander of the undead legions",
  },
  {
    name: "Monk",
    image: monkImg,
    description: "Martial artist channeling inner chi",
  },
  {
    name: "Warlock",
    image: warlockImg,
    description: "Wielder of demonic pacts and hellfire",
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
  return (
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

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          {classes.map((classItem) => (
            <motion.div
              key={classItem.name}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-xl cursor-pointer"
            >
              <div className="aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
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
    </section>
  );
};
