import { apiGet, apiPost } from './apiClient';

export interface VoteStreakTier {
  id: number;
  min_streak: number;
  max_streak: number | null;
  multiplier: number;
  bonus_coins: number;
  bonus_vip: number;
  badge_name: string | null;
  badge_icon: string | null;
  is_active: boolean;
}

export interface VoteStreakData {
  currentStreak: number;
  longestStreak: number;
  lastStreakVote: string | null;
  streakExpiresAt: string | null;
  currentMultiplier: number;
  currentTier: VoteStreakTier | null;
  nextTier: { days: number; multiplier: number; badge_name: string | null } | null;
  streakBadge: { name: string; icon: string } | null;
}

export interface VoteStreakTierFormData {
  min_streak: number;
  max_streak: number | null;
  multiplier: number;
  bonus_coins: number;
  bonus_vip: number;
  badge_name?: string;
  badge_icon?: string;
  is_active: boolean;
}

export const voteStreakApi = {
  // Get user's streak data
  async getStreakData(username: string): Promise<VoteStreakData | null> {
    try {
      const data = await apiGet<{
        success?: boolean;
        current_streak?: number;
        longest_streak?: number;
        last_streak_vote?: string;
        streak_expires_at?: string;
        current_multiplier?: number;
        current_tier?: VoteStreakTier;
        next_tier?: { days: number; multiplier: number; badge_name: string | null };
        streak_badge?: { name: string; icon: string };
      }>(`/vote_streaks.php?action=get_streak&username=${encodeURIComponent(username)}`);
      
      if (data.success) {
        return {
          currentStreak: data.current_streak || 0,
          longestStreak: data.longest_streak || 0,
          lastStreakVote: data.last_streak_vote || null,
          streakExpiresAt: data.streak_expires_at || null,
          currentMultiplier: data.current_multiplier || 1,
          currentTier: data.current_tier || null,
          nextTier: data.next_tier || null,
          streakBadge: data.streak_badge || null,
        };
      }
      return null;
    } catch {
      // Return demo data for development
      return {
        currentStreak: 7,
        longestStreak: 14,
        lastStreakVote: new Date().toISOString(),
        streakExpiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
        currentMultiplier: 1.5,
        currentTier: {
          id: 3,
          min_streak: 7,
          max_streak: 13,
          multiplier: 1.5,
          bonus_coins: 25,
          bonus_vip: 15,
          badge_name: "Week Warrior",
          badge_icon: "⭐",
          is_active: true,
        },
        nextTier: { days: 14, multiplier: 1.75, badge_name: "Fortnight Champion" },
        streakBadge: { name: "Week Warrior", icon: "⭐" },
      };
    }
  },

  // Get all streak tiers (for GM)
  async getAllTiers(): Promise<VoteStreakTier[]> {
    try {
      const data = await apiGet<{ tiers?: VoteStreakTier[] }>('/vote_streaks.php?action=list_tiers');
      return data.tiers || [];
    } catch {
      // Return demo data
      return [
        { id: 1, min_streak: 1, max_streak: 2, multiplier: 1.0, bonus_coins: 0, bonus_vip: 0, badge_name: null, badge_icon: null, is_active: true },
        { id: 2, min_streak: 3, max_streak: 6, multiplier: 1.25, bonus_coins: 10, bonus_vip: 5, badge_name: "Dedicated Voter", badge_icon: "🔥", is_active: true },
        { id: 3, min_streak: 7, max_streak: 13, multiplier: 1.5, bonus_coins: 25, bonus_vip: 15, badge_name: "Week Warrior", badge_icon: "⭐", is_active: true },
        { id: 4, min_streak: 14, max_streak: 29, multiplier: 1.75, bonus_coins: 50, bonus_vip: 30, badge_name: "Fortnight Champion", badge_icon: "💎", is_active: true },
        { id: 5, min_streak: 30, max_streak: null, multiplier: 2.0, bonus_coins: 100, bonus_vip: 50, badge_name: "Monthly Legend", badge_icon: "👑", is_active: true },
      ];
    }
  },

  // Add new tier (GM only)
  async addTier(tier: VoteStreakTierFormData): Promise<boolean> {
    try {
      const result = await apiPost<{ success: boolean }>('/vote_streaks.php', { action: "add_tier", ...tier });
      return result.success;
    } catch {
      return false;
    }
  },

  // Update tier (GM only)
  async updateTier(id: number, tier: Partial<VoteStreakTierFormData>): Promise<boolean> {
    try {
      const result = await apiPost<{ success: boolean }>('/vote_streaks.php', { action: "update_tier", id, ...tier });
      return result.success;
    } catch {
      return false;
    }
  },

  // Delete tier (GM only)
  async deleteTier(id: number): Promise<boolean> {
    try {
      const result = await apiPost<{ success: boolean }>('/vote_streaks.php', { action: "delete_tier", id });
      return result.success;
    } catch {
      return false;
    }
  },

  // Toggle tier active status (GM only)
  async toggleTier(id: number, is_active: boolean): Promise<boolean> {
    return this.updateTier(id, { is_active });
  },

  // Get streak leaderboard
  async getLeaderboard(): Promise<{ username: string; current_streak: number; longest_streak: number }[]> {
    try {
      const data = await apiGet<{ leaderboard?: { username: string; current_streak: number; longest_streak: number }[] }>(
        '/vote_streaks.php?action=leaderboard'
      );
      return data.leaderboard || [];
    } catch {
      return [];
    }
  },
};
