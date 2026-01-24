import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

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
      return await apiGet<Notification[]>('/notifications.php?action=list');
    } catch {
      // Silent fail - don't expose errors in production
      return [];
    }
  },

  async create(notification: { title: string; message: string; type: string; created_by: string }): Promise<boolean> {
    try {
      const result = await apiPost<{ success: boolean }>('/notifications.php?action=create', notification);
      return result.success;
    } catch {
      // Silent fail - don't expose errors in production
      return false;
    }
  },

  async update(id: number, notification: { title: string; message: string; type: string }): Promise<boolean> {
    try {
      const result = await apiPut<{ success: boolean }>(`/notifications.php?action=update&id=${id}`, notification);
      return result.success;
    } catch {
      // Silent fail - don't expose errors in production
      return false;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      const result = await apiDelete<{ success: boolean }>(`/notifications.php?action=delete&id=${id}`);
      return result.success;
    } catch {
      // Silent fail - don't expose errors in production
      return false;
    }
  },
};
