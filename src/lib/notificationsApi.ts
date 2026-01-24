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

const coerceNotificationArray = (value: unknown): Notification[] => {
  if (Array.isArray(value)) return value as Notification[];
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    const nested = v.notifications ?? v.data ?? v.items;
    if (Array.isArray(nested)) return nested as Notification[];
  }
  return [];
};

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    try {
      const data = await apiGet<unknown>('/notifications.php?action=list');
      return coerceNotificationArray(data);
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
