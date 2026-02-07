import { getAuthHeaders } from './apiFetch';

// Configure your PHP API URL here
const API_BASE_URL = 'https://woiendgame.online/api';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'news' | 'update' | 'maintenance' | 'event';
  created_by: string;
  created_at: string;
  is_active: number;
}

export interface AutoNotificationSettings {
  daily_zen_enabled: boolean;
  spin_wheel_enabled: boolean;
  vote_streak_enabled: boolean;
  gamepass_enabled: boolean;
}

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications.php?action=list`);
      if (!response.ok) {
        console.warn('Notifications API returned non-OK status:', response.status);
        return [];
      }
      const data = await response.json();
      
      // Always extract and validate the notifications array
      // New format: { success: true, notifications: [...] }
      if (data && typeof data === 'object' && Array.isArray(data.notifications)) {
        return data.notifications;
      }
      // Old format: direct array
      if (Array.isArray(data)) {
        return data;
      }
      // Any other format returns empty array
      console.warn('Notifications API returned unexpected format:', typeof data);
      return [];
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
      return [];
    }
  },

  async create(notification: { title: string; message: string; type: string; created_by: string }): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications.php?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(notification),
      });
      const result = await response.json();
      return result.success;
    } catch {
      // Silent fail - don't expose errors in production
      return false;
    }
  },

  async update(id: number, notification: { title: string; message: string; type: string }): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications.php?action=update&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(notification),
      });
      const result = await response.json();
      return result.success;
    } catch {
      // Silent fail - don't expose errors in production
      return false;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications.php?action=delete&id=${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
        credentials: 'include',
      });
      const result = await response.json();
      return result.success;
    } catch {
      // Silent fail - don't expose errors in production
      return false;
    }
  },
};

export const autoNotificationSettingsApi = {
  async get(): Promise<AutoNotificationSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications.php?action=auto_settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      // Handle new format { success, settings } or old format (direct object)
      const settings = data.settings || data;
      return {
        daily_zen_enabled: !!settings.daily_zen_enabled,
        spin_wheel_enabled: !!settings.spin_wheel_enabled,
        vote_streak_enabled: !!settings.vote_streak_enabled,
        gamepass_enabled: !!settings.gamepass_enabled,
      };
    } catch {
      return {
        daily_zen_enabled: false,
        spin_wheel_enabled: false,
        vote_streak_enabled: false,
        gamepass_enabled: false,
      };
    }
  },

  async update(settings: AutoNotificationSettings): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications.php?action=update_auto_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      return result.success;
    } catch {
      return false;
    }
  },
};
