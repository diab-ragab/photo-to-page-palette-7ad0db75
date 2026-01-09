import { Notification } from "./notificationsApi";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  image: string;
  readTime: number;
  isNotification?: boolean;
}

// Map notification type to category
const typeToCategory: Record<string, string> = {
  news: "News",
  update: "Updates",
  maintenance: "Maintenance",
  event: "Events",
};

// Convert notification to blog post format
export const notificationToBlogPost = (notification: Notification): BlogPost => {
  const slug = `notification-${notification.id}`;
  const wordCount = notification.message.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return {
    id: `notif-${notification.id}`,
    slug,
    title: notification.title,
    excerpt: notification.message.slice(0, 150) + (notification.message.length > 150 ? "..." : ""),
    content: notification.message,
    author: notification.created_by || "GM Team",
    publishedAt: notification.created_at,
    category: typeToCategory[notification.type] || "News",
    image: "/og-image.jpg",
    readTime,
    isNotification: true,
  };
};

export const staticBlogPosts: BlogPost[] = [
  {
    id: "1",
    slug: "season-5-update-new-dungeons",
    title: "Season 5 Update: New Dungeons & Epic Loot",
    excerpt: "Explore the brand new dungeons coming in Season 5, featuring challenging bosses and exclusive legendary gear.",
    content: `
## Welcome to Season 5

We're thrilled to announce the biggest content update yet for WOI Endgame! Season 5 brings three new dungeons, each with unique mechanics and incredible rewards.

### The Abyssal Depths

Venture into the underwater realm of the Abyssal Depths, where ancient sea creatures guard treasures lost to time. This dungeon features:

- **5 challenging boss encounters**
- **New underwater combat mechanics**
- **Exclusive aquatic mount drops**

### Volcanic Forge

Test your mettle in the Volcanic Forge, a dungeon set within an active volcano. Brave the heat to claim legendary weapons forged in eternal flame.

### Celestial Sanctum

Ascend to the heavens in the Celestial Sanctum, our most challenging dungeon yet. Only the most skilled players will conquer the celestial guardians.

## New Legendary Gear

Season 5 introduces 15 new legendary items, each with unique set bonuses and visual effects. Collect the complete sets to unlock devastating power.

Join us on Discord for the official launch event!
    `,
    author: "GM Shadowblade",
    publishedAt: "2025-01-15",
    category: "Updates",
    image: "/og-image.jpg",
    readTime: 4,
  },
  {
    id: "2",
    slug: "class-balancing-patch-notes",
    title: "Class Balancing: January Patch Notes",
    excerpt: "Major class balance changes are here! See how your favorite class has been adjusted for better gameplay.",
    content: `
## January Class Balance Update

After extensive community feedback and internal testing, we're rolling out significant balance changes to ensure fair and exciting gameplay.

### Berserker Changes

- **Rage Generation**: Increased by 15%
- **Blood Fury**: Cooldown reduced from 60s to 45s
- **Whirlwind**: Damage increased by 10%

### Magus Adjustments

- **Arcane Missiles**: Now pierces through enemies
- **Mana Shield**: Absorption increased by 20%
- **Teleport**: Range increased by 5 meters

### Paladin Updates

- **Divine Shield**: Duration reduced to 6 seconds
- **Holy Strike**: Healing component increased by 25%
- **Consecration**: Area of effect increased

### Assassin Tweaks

- **Stealth**: Energy cost reduced
- **Backstab**: Critical damage multiplier increased
- **Smoke Bomb**: Now also provides brief immunity

## Community Feedback

We value your input! Join our Discord to share your thoughts on these changes and help shape future updates.
    `,
    author: "Dev Team",
    publishedAt: "2025-01-10",
    category: "Patch Notes",
    image: "/og-image.jpg",
    readTime: 3,
  },
  {
    id: "3",
    slug: "pvp-tournament-announcement",
    title: "Grand PvP Tournament: $500 Prize Pool",
    excerpt: "Register now for our biggest PvP tournament yet! Compete for glory and a share of the $500 prize pool.",
    content: `
## WOI Endgame Grand Tournament

Are you ready to prove yourself as the ultimate champion? We're hosting our largest PvP tournament with a massive $500 prize pool!

### Tournament Details

- **Date**: February 15-16, 2025
- **Format**: Single elimination, best of 3
- **Prize Pool**: $500 total

### Prize Distribution

1. **1st Place**: $250 + Exclusive Champion Title
2. **2nd Place**: $150 + Finalist Title
3. **3rd Place**: $100 + Semi-Finalist Title

### How to Register

1. Join our Discord server
2. Navigate to the #tournament-registration channel
3. Submit your character name and class
4. Registration closes February 10th

### Rules

- All participants must have a level 150 character
- No exploits or third-party software allowed
- Matches will be streamed on our Twitch channel

## Spectator Rewards

Even if you don't compete, watch the tournament live to earn exclusive cosmetic rewards! Every viewer receives a special tournament pet.

Good luck to all participants!
    `,
    author: "Event Team",
    publishedAt: "2025-01-05",
    category: "Events",
    image: "/og-image.jpg",
    readTime: 3,
  },
  {
    id: "4",
    slug: "new-player-guide-2025",
    title: "New Player Guide: Getting Started in 2025",
    excerpt: "Everything new players need to know to start their adventure in WOI Endgame.",
    content: `
## Welcome to WOI Endgame!

Whether you're a seasoned MMORPG veteran or new to the genre, this guide will help you get started on your adventure.

### Downloading & Installation

1. Visit our website and download the launcher
2. Create your account with a valid email
3. Install the client (approximately 8GB)
4. Launch and begin your journey!

### Choosing Your Class

We offer 9 unique classes, each with distinct playstyles:

- **Berserker**: High damage, close combat
- **Paladin**: Tank and support hybrid
- **Magus**: Ranged magical damage
- **Assassin**: Stealth and burst damage
- **Ranger**: Ranged physical damage
- **Necromancer**: Summoner and dark magic
- **Monk**: Martial arts and healing
- **Warlock**: Curses and damage over time
- **Heretic**: Dark support and debuffs

### Leveling Tips

- Complete the main questline for XP and gear
- Join dungeon groups at level 30+
- Daily quests reset at midnight server time
- Use the bonus XP weekends (announced on Discord)

### Joining the Community

Our Discord server is the heart of the community. Join to find groups, get help, and stay updated on events!

See you in-game!
    `,
    author: "Community Team",
    publishedAt: "2025-01-01",
    category: "Guides",
    image: "/og-image.jpg",
    readTime: 5,
  },
];

// Legacy export for backward compatibility
export const blogPosts = staticBlogPosts;

export const getBlogPostBySlug = (slug: string): BlogPost | undefined => {
  return staticBlogPosts.find((post) => post.slug === slug);
};

export const getRecentPosts = (count: number = 3): BlogPost[] => {
  return [...staticBlogPosts]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, count);
};
