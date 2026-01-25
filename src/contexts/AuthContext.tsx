import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { setCsrfToken, clearCsrfToken, apiGet } from "@/lib/apiClient";

interface User {
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isGM: boolean;
  gmLoading: boolean;
  gmError: boolean;
  rememberMe: boolean;
  loading: boolean;
  login: (username: string, email: string, rememberMe?: boolean, csrfToken?: string) => void;
  logout: () => void;
  checkGMStatus: () => Promise<boolean>;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Security: Only store non-sensitive user data in localStorage
// GM status is NEVER stored client-side - always fetched from server
const STORAGE_KEY = "woi_user";
const REMEMBER_ME_KEY = "woi_remember_me";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      if (
        parsed &&
        typeof parsed.username === "string" &&
        typeof parsed.email === "string"
      ) {
        return { username: parsed.username, email: parsed.email };
      }

      return null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [gmLoading, setGmLoading] = useState(false);
  const [isGM, setIsGM] = useState(false);
  const [gmError, setGmError] = useState(false);
  const didInitialHydration = useRef(false);
  const userRef = useRef<User | null>(user);

  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Keep a ref to the latest user so callbacks can stay stable.
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Check if session is still valid on the server
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const data = await apiGet<{
        authenticated: boolean;
        user?: { username: string; email: string };
        csrf_token?: string;
      }>("/auth.php?action=check_session");

      if (data.authenticated && data.user) {
        setUser({ username: data.user.username, email: data.user.email || "" });

        if (data.csrf_token) {
          setCsrfToken(data.csrf_token);
        }

        return true;
      }

      // Session expired - clear local state
      setUser(null);
      setIsGM(false);
      clearCsrfToken();
      localStorage.removeItem(STORAGE_KEY);
      return false;
    } catch {
      // If the network is down, keep whatever client state we already have.
      // If we had no user, we must treat as logged out.
      return !!userRef.current;
    }
  }, []);

  // Security: GM check uses session-based auth only - no username in URL
  // This prevents enumeration of GM accounts via the endpoint
  const checkGMStatus = useCallback(async (): Promise<boolean> => {
    // Use ref for latest user to avoid stale closures
    const currentUser = userRef.current;
    if (!currentUser?.username) {
      setIsGM(false);
      setGmError(false);
      return false;
    }

    setGmLoading(true);
    setGmError(false);
    try {
      // Backend validates the CURRENT session user's GM status
      const data = await apiGet<{ is_gm?: boolean }>("/check_gm.php");

      const gmStatus = !!data.is_gm;
      setIsGM(gmStatus);
      setGmError(false);
      return gmStatus;
    } catch (error) {
      // Fail closed for GM - but log in dev for debugging
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("GM check failed:", error);
      }
      setIsGM(false);
      setGmError(true);
      return false;
    } finally {
      setGmLoading(false);
    }
  }, []);

  const login = useCallback(
    (
      username: string,
      email: string,
      remember: boolean = false,
      csrfTokenValue?: string
    ) => {
      const userData: User = { username, email };

      setUser(userData);
      // Keep ref in sync immediately so downstream checks (GM check) can run right after login.
      userRef.current = userData;
      setIsGM(false);
      setGmError(false);
      setRememberMe(remember);

      try {
        if (remember) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        localStorage.setItem(REMEMBER_ME_KEY, String(remember));
      } catch {
        // ignore storage errors
      }

      if (csrfTokenValue) {
        setCsrfToken(csrfTokenValue);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    // Clear local state immediately for instant UI feedback
    setUser(null);
    setIsGM(false);
    setGmError(false);
    setRememberMe(false);
    clearCsrfToken();

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REMEMBER_ME_KEY);
    } catch {
      // ignore storage errors
    }

    // Best-effort server-side logout (don't block on network errors)
    try {
      await apiGet("/auth.php?action=logout");
    } catch {
      // ignore - user is already logged out client-side
    }
  }, []);

  // Initial hydration: restore server session and GM status.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      const isAuthenticated = await checkSession();
      if (cancelled) return;
      didInitialHydration.current = true;
      setLoading(false);

      // Only check GM status after successful session restoration
      if (isAuthenticated && userRef.current?.username) {
        checkGMStatus();
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [checkSession, checkGMStatus]);

  // If the user logs in later (after initial hydration), check GM status
  useEffect(() => {
    if (!didInitialHydration.current) return;
    if (user?.username) {
      checkGMStatus();
    } else {
      setIsGM(false);
      setGmError(false);
    }
  }, [user?.username, checkGMStatus]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoggedIn: !!user,
      isGM,
      gmLoading,
      gmError,
      rememberMe,
      loading,
      login,
      logout,
      checkGMStatus,
      checkSession,
    }),
    [user, isGM, gmLoading, gmError, rememberMe, loading, login, logout, checkGMStatus, checkSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
