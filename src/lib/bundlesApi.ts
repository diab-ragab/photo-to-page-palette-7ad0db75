import { API_BASE, getAuthHeaders } from './apiFetch';

export interface BundleItem {
  id?: number;
  item_name: string;
  quantity: number;
  icon: string;
  icon_emoji?: string;
  item_id?: number;
  item_quantity?: number;
  sort_order?: number;
}

export interface Bundle {
  id: number;
  name: string;
  description: string | null;
  original_price: number;
  sale_price: number;
  discount_percent: number;
  ends_at: string;
  ends_at_ts?: number;
  is_featured: boolean;
  stock: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  items: BundleItem[];
}

export interface BundleFormData {
  name: string;
  description: string;
  original_price: number;
  sale_price: number;
  ends_at: string;
  is_featured: boolean;
  stock: number | null;
  is_active: boolean;
  items: BundleItem[];
}

export const bundlesApi = {
  async getActive(): Promise<{ bundles: Bundle[]; server_time: number }> {
    const response = await fetch(`${API_BASE}/bundles.php?action=list&rid=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch bundles");
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to fetch bundles");
    return { bundles: data.bundles || [], server_time: data.server_time };
  },

  async getAll(): Promise<Bundle[]> {
    const response = await fetch(`${API_BASE}/bundles.php?action=list_all&rid=${Date.now()}`, {
      cache: "no-store",
      credentials: "include",
      headers: { ...getAuthHeaders(), Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch bundles");
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to fetch bundles");
    return data.bundles || [];
  },

  async create(bundle: BundleFormData): Promise<{ bundle_id: number }> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action: "create", ...bundle }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to create bundle");
    return { bundle_id: data.bundle_id };
  },

  async update(id: number, bundle: BundleFormData): Promise<void> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action: "update", id, ...bundle }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to update bundle");
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action: "delete", id }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to delete bundle");
  },

  async toggle(id: number, is_active: boolean): Promise<void> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action: "toggle", id, is_active }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to toggle bundle");
  },

  async purchase(bundleId: number, characterId: number, characterName: string): Promise<{ url: string; order_id: number }> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action: "purchase", bundle_id: bundleId, character_id: characterId, character_name: characterName }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to initiate purchase");
    return { url: data.url, order_id: data.order_id };
  },

  async cancelOrder(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/bundle_cancel.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!data.success) console.warn("Bundle cancel response:", data.message);
    } catch (err) {
      console.warn("Bundle cancel failed:", err);
    }
  },
};

export const BUNDLE_ICON_OPTIONS = [
  { code: "GIFT", emoji: "🎁", label: "Gift" },
  { code: "GEM", emoji: "💎", label: "Gem/Zen" },
  { code: "SWORD", emoji: "🗡️", label: "Weapon" },
  { code: "SHIELD", emoji: "🛡️", label: "Armor" },
  { code: "CROWN", emoji: "👑", label: "Legendary" },
  { code: "STAR", emoji: "⭐", label: "VIP" },
  { code: "BOLT", emoji: "⚡", label: "Boost" },
  { code: "MOUNT", emoji: "🐴", label: "Mount" },
  { code: "PET", emoji: "🐉", label: "Pet" },
  { code: "COSTUME", emoji: "👔", label: "Costume" },
  { code: "COINS", emoji: "🪙", label: "Coins" },
  { code: "POTION", emoji: "🧪", label: "Consumable" },
];

export const getIconEmoji = (code: string): string => {
  const found = BUNDLE_ICON_OPTIONS.find((i) => i.code === code);
  return found ? found.emoji : "🎁";
};
