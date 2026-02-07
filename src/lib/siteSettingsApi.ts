import { API_BASE, getAuthHeaders } from './apiFetch';

export interface SiteSettings {
  discord_link: string;
  discord_members: string;
  download_mega: string;
  download_gdrive: string;
  download_filefm: string;
}

const defaultSettings: SiteSettings = {
  discord_link: 'https://discord.gg/vubqbv3U3y',
  discord_members: '15,403',
  download_mega: 'https://mega.nz/file/x3BCVb6B#2_nAOHbfXNzzAyEEpMg-Yn1wiPJRprs27jOm31_a9gA',
  download_gdrive: 'https://drive.google.com/file/d/1wYtPOZ5pWw4yVO4_R_wVlKxMvvkgJfJ3/view?usp=sharing',
  download_filefm: 'https://files.fm/u/czrengvywk',
};

let cachedSettings: SiteSettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function getSiteSettings(forceRefresh = false): Promise<SiteSettings> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    const response = await fetch(`${API_BASE}/site_settings.php?rid=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const data = await response.json();
    if (data.success && data.settings) {
      cachedSettings = { ...defaultSettings, ...data.settings };
      cacheTimestamp = now;
      return cachedSettings;
    }
  } catch (error) {
    console.error('[SiteSettings] Failed to fetch:', error);
  }
  return defaultSettings;
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/site_settings.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({ settings }),
    });
    const data = await response.json();
    if (data.success) { cachedSettings = null; cacheTimestamp = 0; }
    return data;
  } catch (error) {
    console.error('[SiteSettings] Update failed:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}

export function clearSettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}
