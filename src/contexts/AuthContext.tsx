import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
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

  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Check if session is still valid on the server
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!user?.username) return false;

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
      // Fail-open: if network/server fails, don't lock user on skeleton
      return true;
    }
  }, [user?.username]);

  const checkGMStatus = useCallback(async (): Promise<boolean> => {
    if (!user?.username) {
      setIsGM(false);
      return false;
    }

    setGmLoading(true);
    try {
      const data = await apiGet<{ is_gm?: boolean }>(
        `/check_gm.php?user=${encodeURIComponent(user.username)}`
      );

      const gmStatus = !!data.is_gm;
      setIsGM(gmStatus);
      return gmStatus;
    } catch {
      // Fail closed for GM
      setIsGM(false);
      return false;
    } finally {
      setGmLoading(false);
    }
  }, [user?.username]);

  const login = useCallback(
    (
      username: string,
      email: string,
      remember: boolean = false,
      csrfTokenValue?: string
    ) => {
      const userData: User = { username, email };

      setUser(userData);
      setIsGM(false);
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
    try {
      await apiGet("/auth.php?action=logout");
    } catch {
      // ignore
    }

    setUser(null);
    setIsGM(false);
    setRememberMe(false);
    clearCsrfToken();

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REMEMBER_ME_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Boot: mark loading false after initial mount
  useEffect(() => {
    setLoading(false);
  }, []);

  // Check session whenever user changes
  useEffect(() => {
    if (user?.username) {
      checkSession();
    }
  }, [user?.username, checkSession]);

  // Check GM status when user is available
  useEffect(() => {
    if (user?.username) {
      checkGMStatus();
    } else {
      setIsGM(false);
    }
  }, [user?.username, checkGMStatus]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoggedIn: !!user,
      isGM,
      gmLoading,
      rememberMe,
      loading,
      login,
      logout,
      checkGMStatus,
      checkSession,
    }),
    [user, isGM, gmLoading, rememberMe, loading, login, logout, checkGMStatus, checkSession]
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
