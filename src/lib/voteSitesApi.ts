import { API_BASE, getAuthHeaders } from './apiFetch';

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
  timeRemaining: number | null;
  secondsRemaining: number | null;
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
  async getActiveSites(): Promise<VoteSite[]> {
    const response = await fetch(`${API_BASE}/vote_sites.php?action=list&rid=${Date.now()}`, {
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch vote sites");
    const data = await response.json();
    return data.sites || [];
  },

  async getAllSites(): Promise<VoteSite[]> {
    const response = await fetch(`${API_BASE}/vote_sites.php?action=list_all&rid=${Date.now()}`, {
      cache: "no-store",
      redirect: "error",
      credentials: "include",
      headers: { ...getAuthHeaders(), Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch vote sites");
    const data = await response.json();
    return data.sites || [];
  },

  async addSite(site: VoteSiteFormData): Promise<boolean> {
    const response = await fetch(`${API_BASE}/vote_sites.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action: "add", ...site }),
    });
    const result = await response.json();
    return result.success === true;
  },

  async updateSite(id: number, site: Partial<VoteSiteFormData>): Promise<boolean> {
    const response = await fetch(`${API_BASE}/vote_sites.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action: "update", id, ...site }),
    });
    const result = await response.json();
    return result.success === true;
  },

  async deleteSite(id: number): Promise<boolean> {
    const response = await fetch(`${API_BASE}/vote_sites.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action: "delete", id }),
    });
    const result = await response.json();
    return result.success === true;
  },

  async toggleSite(id: number, is_active: boolean): Promise<boolean> {
    return this.updateSite(id, { is_active });
  },
};
