const API_BASE_URL = "https://woiendgame.online/api";

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
    const response = await fetch(`${API_BASE_URL}/vote_sites.php?action=list`);
    if (!response.ok) throw new Error("Failed to fetch vote sites");
    const data = await response.json();
    return data.sites || [];
  },

  // Get all vote sites including inactive (for Admin)
  async getAllSites(): Promise<VoteSite[]> {
    const response = await fetch(`${API_BASE_URL}/vote_sites.php?action=list_all`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch vote sites");
    const data = await response.json();
    return data.sites || [];
  },

  // Add new vote site (Admin only)
  async addSite(site: VoteSiteFormData): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/vote_sites.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "add", ...site }),
    });
    const result = await response.json();
    return result.success === true;
  },

  // Update vote site (Admin only)
  async updateSite(id: number, site: Partial<VoteSiteFormData>): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/vote_sites.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "update", id, ...site }),
    });
    const result = await response.json();
    return result.success === true;
  },

  // Delete vote site (Admin only)
  async deleteSite(id: number): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/vote_sites.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "delete", id }),
    });
    const result = await response.json();
    return result.success === true;
  },

  // Toggle site active status (Admin only)
  async toggleSite(id: number, is_active: boolean): Promise<boolean> {
    return this.updateSite(id, { is_active });
  },
};
