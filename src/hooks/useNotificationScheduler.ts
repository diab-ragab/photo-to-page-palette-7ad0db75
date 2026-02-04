import { useEffect, useRef, useCallback } from 'react';
import { usePushNotifications } from './usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

interface SchedulerState {
  lastStreakCheck: number;
  lastRewardCheck: number;
  lastEventCheck: number;
}

const STORAGE_KEY = 'woi_notification_scheduler';
const CHECK_INTERVAL = 60000; // Check every minute

export const useNotificationScheduler = () => {
  const { isLoggedIn } = useAuth();
  const { 
    preferences, 
    permission,
    notifyStreakExpiring, 
    notifyRewardsReady, 
    notifyEventStarting 
  } = usePushNotifications();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<SchedulerState>({
    lastStreakCheck: 0,
    lastRewardCheck: 0,
    lastEventCheck: 0,
  });

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        stateRef.current = JSON.parse(saved);
      } catch {
        // Invalid JSON
      }
    }
  }, []);

  // Save state
  const saveState = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
  }, []);

  // Check streak expiring
  const checkStreakExpiring = useCallback(async () => {
    if (!preferences.streakExpiring) return;
    
    const now = Date.now();
    // Only check once per hour
    if (now - stateRef.current.lastStreakCheck < 3600000) return;
    
    try {
      // Get streak data from localStorage (set by vote system)
      const streakData = localStorage.getItem('woi_streak_data');
      if (!streakData) return;
      
      const { expiresAt } = JSON.parse(streakData);
      if (!expiresAt) return;
      
      const expiresTime = new Date(expiresAt).getTime();
      const hoursRemaining = Math.floor((expiresTime - now) / 3600000);
      
      // Notify if expiring within 6 hours
      if (hoursRemaining > 0 && hoursRemaining <= 6) {
        notifyStreakExpiring(hoursRemaining);
        stateRef.current.lastStreakCheck = now;
        saveState();
      }
    } catch {
      // Ignore errors
    }
  }, [preferences.streakExpiring, notifyStreakExpiring, saveState]);

  // Check rewards ready
  const checkRewardsReady = useCallback(async () => {
    if (!preferences.rewardsReady) return;
    
    const now = Date.now();
    // Only check once per 30 minutes
    if (now - stateRef.current.lastRewardCheck < 1800000) return;
    
    try {
      // Check daily zen cooldown from localStorage
      const zenCooldown = localStorage.getItem('woi_zen_cooldown');
      if (zenCooldown) {
        const cooldownEnd = parseInt(zenCooldown, 10);
        if (cooldownEnd > 0 && now >= cooldownEnd) {
          notifyRewardsReady('daily_zen');
          stateRef.current.lastRewardCheck = now;
          saveState();
        }
      }
      
      // Check spin cooldown
      const spinCooldown = localStorage.getItem('woi_spin_cooldown');
      if (spinCooldown) {
        const cooldownEnd = parseInt(spinCooldown, 10);
        if (cooldownEnd > 0 && now >= cooldownEnd) {
          notifyRewardsReady('spin');
          stateRef.current.lastRewardCheck = now;
          saveState();
        }
      }
    } catch {
      // Ignore errors
    }
  }, [preferences.rewardsReady, notifyRewardsReady, saveState]);

  // Check events starting
  const checkEventsStarting = useCallback(async () => {
    if (!preferences.eventsStarting) return;
    
    const now = Date.now();
    // Only check once per 5 minutes
    if (now - stateRef.current.lastEventCheck < 300000) return;
    
    try {
      // Get cached events from localStorage
      const eventsData = localStorage.getItem('woi_upcoming_events');
      if (!eventsData) return;
      
      const events = JSON.parse(eventsData);
      const notifiedEvents = JSON.parse(localStorage.getItem('woi_notified_events') || '[]');
      
      for (const event of events) {
        const startTime = new Date(event.start_date).getTime();
        const timeDiff = startTime - now;
        
        // Notify 5 minutes before event starts
        if (timeDiff > 0 && timeDiff <= 300000 && !notifiedEvents.includes(event.id)) {
          notifyEventStarting(event.title, event.event_type);
          notifiedEvents.push(event.id);
          localStorage.setItem('woi_notified_events', JSON.stringify(notifiedEvents));
          stateRef.current.lastEventCheck = now;
          saveState();
        }
      }
    } catch {
      // Ignore errors
    }
  }, [preferences.eventsStarting, notifyEventStarting, saveState]);

  // Main scheduler loop
  useEffect(() => {
    if (!isLoggedIn || permission !== 'granted' || !preferences.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const runChecks = () => {
      checkStreakExpiring();
      checkRewardsReady();
      checkEventsStarting();
    };

    // Run initial check
    runChecks();

    // Set up interval
    intervalRef.current = setInterval(runChecks, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    isLoggedIn, 
    permission, 
    preferences.enabled, 
    checkStreakExpiring, 
    checkRewardsReady, 
    checkEventsStarting
  ]);

  return null;
};
