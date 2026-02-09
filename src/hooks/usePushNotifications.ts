import { useState, useEffect, useCallback } from 'react';

export interface NotificationPreferences {
  enabled: boolean;
  streakExpiring: boolean;
  rewardsReady: boolean;
  eventsStarting: boolean;
  announcements: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  streakExpiring: true,
  rewardsReady: true,
  eventsStarting: true,
  announcements: true,
};

const STORAGE_KEY = 'woi_notification_prefs';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isSupported, setIsSupported] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
    
    // Load saved preferences
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(saved) });
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  // Register service worker ONLY when notifications are enabled.
  // This prevents Workbox/PWA SW behavior from interfering with normal API fetches
  // for users who never opt into notifications.
  const ensureSwRegistration = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isSupported) return null;
    if (swRegistration) return swRegistration;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      setSwRegistration(registration);
      console.log('[Notifications] Service worker registered');
      return registration;
    } catch (error) {
      console.error('[Notifications] SW registration failed:', error);
      return null;
    }
  }, [isSupported, swRegistration]);

  useEffect(() => {
    if (!isSupported) return;
    if (permission !== 'granted') return;
    if (!preferences.enabled) return;

    void ensureSwRegistration();
  }, [isSupported, permission, preferences.enabled, ensureSwRegistration]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        updatePreferences({ enabled: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      return false;
    }
  }, [isSupported]);

  // Update preferences
  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      return newPrefs;
    });
  }, []);

  // Show local notification
  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions & { type?: keyof Omit<NotificationPreferences, 'enabled'> }
  ): Promise<boolean> => {
    if (!isSupported || permission !== 'granted' || !preferences.enabled) {
      return false;
    }
    
    // Check if this notification type is enabled
    if (options?.type && !preferences[options.type]) {
      return false;
    }
    
    try {
      if (swRegistration) {
        await swRegistration.showNotification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'woi-notification',
          ...options,
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          icon: '/favicon.ico',
          ...options,
        });
      }
      return true;
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
      return false;
    }
  }, [isSupported, permission, preferences, swRegistration]);

  // Notify streak expiring
  const notifyStreakExpiring = useCallback((hoursRemaining: number) => {
    if (!preferences.streakExpiring) return;
    
    showNotification('🔥 Vote Streak Expiring!', {
      body: `Your streak expires in ${hoursRemaining} hours! Vote now to keep your bonus.`,
      tag: 'streak-expiring',
      type: 'streakExpiring',
      data: { url: '/dashboard' },
      requireInteraction: true,
    });
  }, [preferences.streakExpiring, showNotification]);

  // Notify rewards ready
  const notifyRewardsReady = useCallback((rewardType: 'daily_zen' | 'vote' | 'spin') => {
    if (!preferences.rewardsReady) return;
    
    const messages = {
      daily_zen: { title: '💰 Daily Zen Ready!', body: 'Your daily Zen reward is ready to claim!' },
      vote: { title: '🗳️ Vote Available!', body: 'You can vote again and earn rewards!' },
      spin: { title: '🎡 Spin Ready!', body: 'The Lucky Wheel is ready for another spin!' },
    };
    
    const msg = messages[rewardType];
    showNotification(msg.title, {
      body: msg.body,
      tag: `reward-${rewardType}`,
      type: 'rewardsReady',
      data: { url: '/dashboard' },
    });
  }, [preferences.rewardsReady, showNotification]);

  // Notify event starting
  const notifyEventStarting = useCallback((eventTitle: string, eventType: string) => {
    if (!preferences.eventsStarting) return;
    
    const icons: Record<string, string> = {
      double_xp: '⚡',
      double_drops: '💎',
      sale: '🛒',
      boss_hunt: '👹',
      pvp_tournament: '⚔️',
      custom: '🎮',
    };
    
    showNotification(`${icons[eventType] || '📅'} Event Starting!`, {
      body: `${eventTitle} is now live!`,
      tag: 'event-starting',
      type: 'eventsStarting',
      data: { url: '/dashboard' },
      requireInteraction: true,
    });
  }, [preferences.eventsStarting, showNotification]);

  // Notify announcement
  const notifyAnnouncement = useCallback((title: string, message: string) => {
    if (!preferences.announcements) return;
    
    showNotification(`📢 ${title}`, {
      body: message,
      tag: 'announcement',
      type: 'announcements',
      data: { url: '/dashboard' },
    });
  }, [preferences.announcements, showNotification]);

  return {
    isSupported,
    permission,
    preferences,
    requestPermission,
    updatePreferences,
    showNotification,
    notifyStreakExpiring,
    notifyRewardsReady,
    notifyEventStarting,
    notifyAnnouncement,
  };
};
