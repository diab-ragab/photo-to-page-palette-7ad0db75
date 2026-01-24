import { apiGet, apiPost } from './apiClient';

export interface VoteSite {
  id: number;
  name: string;
  url: string;
  image_url: string | null;
  coins_reward: number;
  vip_reward: number;
  cooldown_hours: number;
  is_active: boolean;
  sort_order: number;
}

export interface VoteSiteStatus extends VoteSite {
  canVote: boolean;
  lastVoteTime: string | null;
  nextVoteTime: string | null;
  timeRemaining: number | null; // milliseconds
}

export interface VoteSiteFormData {
  name: string;
  url: string;
  image_url?: string;
  coins_reward: number;
  vip_reward: number;
  cooldown_hours: number;
  is_active: boolean;
  sort_order?: number;
}

export const voteSitesApi = {
  // Get all active vote sites (for users)
  async getActiveSites(): Promise<VoteSite[]> {
    try {
      const data = await apiGet<{ sites?: VoteSite[] }>('/vote_sites.php?action=list');
      return data.sites || [];
    } catch {
      // Return demo data for development
      return [
        { id: 1, name: "TopG", url: "https://topg.org", image_url: null, coins_reward: 50, vip_reward: 25, cooldown_hours: 12, is_active: true, sort_order: 1 },
        { id: 2, name: "Top 100 Arena", url: "https://top100arena.com", image_url: null, coins_reward: 50, vip_reward: 25, cooldown_hours: 12, is_active: true, sort_order: 2 },
        { id: 3, name: "Arena Top 100", url: "https://arenatop100.com", image_url: null, coins_reward: 50, vip_reward: 25, cooldown_hours: 12, is_active: true, sort_order: 3 },
      ];
    }
  },

  // Get all vote sites including inactive (for GM)
  async getAllSites(): Promise<VoteSite[]> {
    try {
      const data = await apiGet<{ sites?: VoteSite[] }>('/vote_sites.php?action=list_all');
      return data.sites || [];
    } catch {
      return [];
    }
  },

  // Add new vote site (GM only)
  async addSite(site: VoteSiteFormData): Promise<boolean> {
    try {
      const result = await apiPost<{ success: boolean }>('/vote_sites.php', { action: "add", ...site });
      return result.success;
    } catch {
      return false;
    }
  },

  // Update vote site (GM only)
  async updateSite(id: number, site: Partial<VoteSiteFormData>): Promise<boolean> {
    try {
      const result = await apiPost<{ success: boolean }>('/vote_sites.php', { action: "update", id, ...site });
      return result.success;
    } catch {
      return false;
    }
  },

  // Delete vote site (GM only)
  async deleteSite(id: number): Promise<boolean> {
    try {
      const result = await apiPost<{ success: boolean }>('/vote_sites.php', { action: "delete", id });
      return result.success;
    } catch {
      return false;
    }
  },

  // Toggle site active status (GM only)
  async toggleSite(id: number, is_active: boolean): Promise<boolean> {
    return this.updateSite(id, { is_active });
  },
};
