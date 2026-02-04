const API_BASE = "https://woiendgame.online/api";

function getAuthHeaders(): HeadersInit {
  const sessionToken = localStorage.getItem("woi_session_token") || "";
  const csrfToken = localStorage.getItem("woi_csrf_token") || "";
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Session-Token": sessionToken,
    "Authorization": `Bearer ${sessionToken}`,
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
  };
}

export interface BundleItem {
  id?: number;
  item_name: string;
  quantity: number;
  icon: string;
  icon_emoji?: string;
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
  // Public: Get active bundles for shop
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

  // Admin: Get all bundles
  async getAll(): Promise<Bundle[]> {
    const response = await fetch(`${API_BASE}/bundles.php?action=list_all&rid=${Date.now()}`, {
      cache: "no-store",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch bundles");
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to fetch bundles");
    return data.bundles || [];
  },

  // Admin: Create bundle
  async create(bundle: BundleFormData): Promise<{ bundle_id: number }> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "create", ...bundle }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to create bundle");
    return { bundle_id: data.bundle_id };
  },

  // Admin: Update bundle
  async update(id: number, bundle: BundleFormData): Promise<void> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "update", id, ...bundle }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to update bundle");
  },

  // Admin: Delete bundle
  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "delete", id }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to delete bundle");
  },

  // Admin: Toggle active status
  async toggle(id: number, is_active: boolean): Promise<void> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "toggle", id, is_active }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to toggle bundle");
  },

  // Public: Purchase bundle
  async purchase(
    bundleId: number,
    characterId: number,
    characterName: string
  ): Promise<{ url: string; order_id: number }> {
    const response = await fetch(`${API_BASE}/bundles.php`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: "purchase",
        bundle_id: bundleId,
        character_id: characterId,
        character_name: characterName,
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to initiate purchase");
    return { url: data.url, order_id: data.order_id };
  },
};

// Icon options for bundle items
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
