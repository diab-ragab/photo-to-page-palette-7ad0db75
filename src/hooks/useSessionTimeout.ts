import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const REMEMBER_ME_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes warning before timeout
const SERVER_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Refresh server session every 5 minutes

interface UseSessionTimeoutOptions {
  enabled?: boolean;
  onTimeout?: () => void;
  onWarning?: () => void;
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
  const { enabled = true, onTimeout, onWarning } = options;
  const { isLoggedIn, logout, rememberMe } = useAuth();
  const { toast } = useToast();
  
  const sessionTimeoutMs = rememberMe ? REMEMBER_ME_TIMEOUT_MS : DEFAULT_SESSION_TIMEOUT_MS;
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastServerRefreshRef = useRef<number>(Date.now());
  const serverRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh server-side session to prevent expiration
  const refreshServerSession = useCallback(async (): Promise<boolean> => {
    try {
      const sessionToken = localStorage.getItem("woi_session_token") || "";
      if (!sessionToken) return false;

      const response = await fetch("https://woiendgame.online/api/auth.php?action=refresh_session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
          "Authorization": `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ session_token: sessionToken }),
      });

      if (!response.ok) {
        console.warn("[Session] Server refresh failed:", response.status);
        return false;
      }

      const data = await response.json();
      
      // Update CSRF token if provided
      if (data.csrf_token) {
        localStorage.setItem("woi_csrf_token", data.csrf_token);
      }
      
      // Update session token if rotated
      if (data.session_token) {
        localStorage.setItem("woi_session_token", data.session_token);
      }

      console.log("[Session] Server session refreshed successfully");
      return true;
    } catch (error) {
      console.error("[Session] Failed to refresh server session:", error);
      return false;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (serverRefreshIntervalRef.current) {
      clearInterval(serverRefreshIntervalRef.current);
      serverRefreshIntervalRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
    });
    
    onTimeout?.();
    logout();
  }, [clearAllTimers, logout, onTimeout, toast]);

  const handleWarning = useCallback(() => {
    setShowWarning(true);
    setRemainingTime(Math.ceil(WARNING_BEFORE_TIMEOUT_MS / 1000));
    
    onWarning?.();
    
    // Start countdown
    countdownRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [onWarning]);

  const resetTimer = useCallback(() => {
    if (!isLoggedIn || !enabled) return;
    
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    
    // Clear existing timers (except server refresh interval)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // Set warning timer (fires 2 minutes before timeout)
    warningRef.current = setTimeout(() => {
      handleWarning();
    }, sessionTimeoutMs - WARNING_BEFORE_TIMEOUT_MS);

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, sessionTimeoutMs);
  }, [isLoggedIn, enabled, handleWarning, handleTimeout, sessionTimeoutMs]);

  const extendSession = useCallback(async () => {
    setShowWarning(false);
    
    // Refresh server session immediately
    const success = await refreshServerSession();
    
    if (success) {
      resetTimer();
      lastServerRefreshRef.current = Date.now();
      
      const extendMessage = rememberMe 
        ? "Your session has been extended for another 7 days."
        : "Your session has been extended for another 30 minutes.";
      
      toast({
        title: "Session Extended",
        description: extendMessage,
      });
    } else {
      toast({
        title: "Session Refresh Failed",
        description: "Please log in again.",
        variant: "destructive",
      });
      logout();
    }
  }, [refreshServerSession, resetTimer, toast, rememberMe, logout]);

  // Set up server-side session refresh interval
  useEffect(() => {
    if (!isLoggedIn || !enabled) {
      if (serverRefreshIntervalRef.current) {
        clearInterval(serverRefreshIntervalRef.current);
        serverRefreshIntervalRef.current = null;
      }
      return;
    }

    // Refresh server session periodically if user is active
    serverRefreshIntervalRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const timeSinceLastRefresh = Date.now() - lastServerRefreshRef.current;
      
      // Only refresh if user was active in the last 5 minutes
      if (timeSinceLastActivity < SERVER_REFRESH_INTERVAL_MS && 
          timeSinceLastRefresh >= SERVER_REFRESH_INTERVAL_MS) {
        refreshServerSession().then((success) => {
          if (success) {
            lastServerRefreshRef.current = Date.now();
          }
        });
      }
    }, SERVER_REFRESH_INTERVAL_MS);

    return () => {
      if (serverRefreshIntervalRef.current) {
        clearInterval(serverRefreshIntervalRef.current);
        serverRefreshIntervalRef.current = null;
      }
    };
  }, [isLoggedIn, enabled, refreshServerSession]);

  // Set up activity listeners
  useEffect(() => {
    if (!isLoggedIn || !enabled) {
      clearAllTimers();
      return;
    }

    const activityEvents = [
      "mousedown",
      "mousemove", 
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Throttle activity updates to prevent excessive timer resets
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledResetTimer = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        // Only reset if not showing warning (user must click extend)
        if (!showWarning) {
          resetTimer();
        }
      }, 1000); // Throttle to once per second
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, throttledResetTimer, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, throttledResetTimer);
      });
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      clearAllTimers();
    };
  }, [isLoggedIn, enabled, resetTimer, clearAllTimers, showWarning]);

  // Clear timers on logout
  useEffect(() => {
    if (!isLoggedIn) {
      clearAllTimers();
      setShowWarning(false);
    }
  }, [isLoggedIn, clearAllTimers]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    resetTimer,
  };
};
