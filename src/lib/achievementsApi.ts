import { getAuthHeaders } from "@/lib/apiFetch";

const API_BASE_URL = "https://woiendgame.online/api";

export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type AchievementCategory = "voting" | "purchases" | "gameplay" | "social" | "events";
export type RequirementType = "count" | "streak" | "level" | "spend" | "custom";

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirement_type: RequirementType;
  requirement_value: number;
  reward_coins: number;
  reward_vip: number;
  rarity: AchievementRarity;
  is_hidden: number;
  is_active: number;
  sort_order: number;
  unlock_count?: number;
}

export interface UserAchievement extends Achievement {
  current_value: number;
  progress_percent: number;
  is_unlocked: boolean;
  is_claimed: boolean;
  unlocked_at: string | null;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  claimed: number;
  unclaimed: number;
}

export interface NewlyUnlocked {
  id: number;
  code: string;
  name: string;
  icon: string;
  rarity: AchievementRarity;
  reward_coins: number;
  reward_vip: number;
}

export interface GameCharacter {
  RoleID: number;
  Name: string;
  Level: number;
  SlotID?: number;
  Profession?: string;
  Sex?: number;
}

export interface RoleInfo {
  role_id: number;
  name: string;
  level: number;
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...getAuthHeaders(),
  };
}

export const achievementsApi = {
  // Public: List all achievements
  async listAchievements(): Promise<Achievement[]> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=list`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    return data.achievements || [];
  },

  // User: Get characters for this account
  async getMyCharacters(): Promise<GameCharacter[]> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=my_characters`, {
      credentials: "include",
      headers: authHeaders(),
    });
    const data = await response.json();
    return data.characters || [];
  },

  // User: Get progress on all achievements (per character)
  async getUserProgress(roleId: number): Promise<{ achievements: UserAchievement[]; stats: AchievementStats; role: RoleInfo }> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=user_progress&role_id=${roleId}`, {
      credentials: "include",
      headers: authHeaders(),
    });
    const data = await response.json();
    return {
      achievements: data.achievements || [],
      stats: data.stats || { total: 0, unlocked: 0, claimed: 0, unclaimed: 0 },
      role: data.role || { role_id: roleId, name: "", level: 0 },
    };
  },

  // User: Check and unlock new achievements (per character)
  async checkUnlocks(roleId: number): Promise<{ newlyUnlocked: NewlyUnlocked[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=check_unlocks&role_id=${roleId}`, {
      credentials: "include",
      headers: authHeaders(),
    });
    const data = await response.json();
    return {
      newlyUnlocked: data.newly_unlocked || [],
      count: data.count || 0,
    };
  },

  // User: Claim achievement reward (per character)
  async claimReward(achievementId: number, roleId: number): Promise<{ success: boolean; coins: number; vip: number; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=claim`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: JSON.stringify({ achievement_id: achievementId, role_id: roleId }),
    });
    const data = await response.json();
    return {
      success: data.success === true,
      coins: data.coins_earned || 0,
      vip: data.vip_earned || 0,
      error: data.error,
    };
  },

  // Admin: List all achievements including inactive
  async adminListAll(): Promise<Achievement[]> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=list_all`, {
      credentials: "include",
      headers: authHeaders(),
    });
    const data = await response.json();
    return data.achievements || [];
  },

  // Admin: Add new achievement
  async adminAdd(achievement: Partial<Achievement>): Promise<{ success: boolean; id?: number; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=add`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: JSON.stringify(achievement),
    });
    const data = await response.json();
    return { success: data.success === true, id: data.id, error: data.error };
  },

  // Admin: Update achievement
  async adminUpdate(id: number, updates: Partial<Achievement>): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=update`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await response.json();
    return data.success === true;
  },

  // Admin: Delete achievement
  async adminDelete(id: number): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=delete`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    return data.success === true;
  },

  // Admin: Get stats
  async adminGetStats(): Promise<{
    total_achievements: number;
    roles_with_achievements: number;
    total_unlocks: number;
    total_claimed: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/achievements.php?action=stats`, {
      credentials: "include",
      headers: authHeaders(),
    });
    const data = await response.json();
    return data.stats || {};
  },
};
