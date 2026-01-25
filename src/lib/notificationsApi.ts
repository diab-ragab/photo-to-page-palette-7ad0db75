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

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications.php?action=list`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return await response.json();
    } catch {
      // Silent fail - don't expose errors in production
      return [];
    }
  },

  async create(notification: { title: string; message: string; type: string; created_by: string }): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications.php?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      });
      const result = await response.json();
      return result.success;
    } catch {
      // Silent fail - don't expose errors in production
      return false;
    }
  },
};
