import berserkerImg from "@/assets/class-berserker.jpg";
import magusImg from "@/assets/class-magus.jpg";
import hereticImg from "@/assets/class-heretic.jpg";
import championImg from "@/assets/class-paladin.jpg";
import slayerImg from "@/assets/class-assassin.jpg";
import duelistImg from "@/assets/class-warlock.jpg";
import rangerImg from "@/assets/class-ranger.jpg";
import enchantressImg from "@/assets/class-monk.jpg";
import harbingerImg from "@/assets/class-necromancer.jpg";

export interface Skill {
  name: string;
  description: string;
  icon: string;
}

export interface ClassStats {
  strength: number;
  defense: number;
  magic: number;
  speed: number;
  health: number;
}

export interface ClassData {
  name: string;
  slug: string;
  image: string;
  description: string;
  lore: string;
  skills: Skill[];
  stats: ClassStats;
  role: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export const classes: ClassData[] = [
  {
    name: "Berzerker",
    slug: "berzerker",
    image: berserkerImg,
    description: "Born to fight with superb skills, advocates strength and craves blood",
    role: "Melee DPS",
    difficulty: "Medium",
    lore: "Gladiators are born to fight, they have superb fighting skills, advocate strength, and crave blood. Suitable for close combat with monsters, they wield their greatswords in the midst of enemy siege and use their blood to clear a path to victory. Gladiators pursue strength, physical attacks and critical hits, making their attacks more stable. They are more suitable for group battles, but if they cannot repel the enemy effectively, they put themselves in danger. Gladiators have some defense against physical damage, but are somewhat powerless against magic damage.",
    skills: [
      { name: "Greatsword Slash", description: "Powerful melee attack with greatsword", icon: "⚔️" },
      { name: "Whirlwind", description: "Spin attack hitting all nearby enemies", icon: "🌀" },
      { name: "Critical Strike", description: "High damage physical attack with crit bonus", icon: "💥" },
      { name: "Battle Fury", description: "Increase attack power and crit rate", icon: "🔥" },
    ],
    stats: { strength: 95, defense: 60, magic: 15, speed: 70, health: 85 },
  },
  {
    name: "Magus",
    slug: "magus",
    image: magusImg,
    description: "Master of arcane and elemental forces",
    role: "Ranged DPS",
    difficulty: "Hard",
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
    slug: "champion",
    image: championImg,
    description: "Heavy armor tank and battlefield controller",
    role: "Tank",
    difficulty: "Easy",
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
    slug: "heretic",
    image: hereticImg,
    description: "Divine light and destructive darkness wielder",
    role: "Hybrid DPS/Healer",
    difficulty: "Hard",
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
    slug: "slayer",
    image: slayerImg,
    description: "Precision striker with balanced offense",
    role: "Melee DPS",
    difficulty: "Medium",
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
    slug: "duelist",
    image: duelistImg,
    description: "Sword and dark magic hybrid fighter",
    role: "Hybrid DPS",
    difficulty: "Hard",
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
    slug: "ranger",
    image: rangerImg,
    description: "Long range tactician and strategist",
    role: "Ranged DPS",
    difficulty: "Medium",
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
    slug: "enchantress",
    image: enchantressImg,
    description: "Lyre-wielding buffer and support specialist",
    role: "Support",
    difficulty: "Easy",
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
    slug: "harbinger",
    image: harbingerImg,
    description: "Soul-capturing scythe wielder",
    role: "Melee DPS",
    difficulty: "Hard",
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

export const getClassBySlug = (slug: string): ClassData | undefined => {
  return classes.find((c) => c.slug === slug);
};

export const getAllClassSlugs = (): string[] => {
  return classes.map((c) => c.slug);
};
