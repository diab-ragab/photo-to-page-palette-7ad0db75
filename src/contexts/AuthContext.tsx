import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
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
      // Security: Only restore username and email, never trust stored isGM
      if (parsed && typeof parsed.username === "string" && typeof parsed.email === "string") {
        return { username: parsed.username, email: parsed.email };
      }
      return null;
    } catch {
      // If parsing fails, clear potentially corrupted data
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });
  
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
    try {
      const data = await apiGet<{ authenticated: boolean; user?: { username: string; email: string }; csrf_token?: string }>(
        "/auth.php?action=check_session"
      );
      
      if (data.authenticated && data.user) {
        setUser({ username: data.user.username, email: data.user.email || "" });
        if (data.csrf_token) {
          setCsrfToken(data.csrf_token);
        }
        return true;
      } else {
        // Session expired - clear local state
        setUser(null);
        setIsGM(false);
        clearCsrfToken();
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
    } catch {
      // Network error - keep local state but flag as potentially stale
      return false;
    }
  }, []);

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
      
      // Security: GM status is stored in state only, never in localStorage
      const gmStatus = !!data.is_gm;
      setIsGM(gmStatus);
      return gmStatus;
    } catch {
      // Security: Fail closed - if GM check fails, treat as non-GM
      setIsGM(false);
      return false;
    } finally {
      setGmLoading(false);
    }
  }, [user?.username]);

  const login = useCallback((username: string, email: string, remember: boolean = false, csrfTokenValue?: string) => {
    // Security: Only store non-sensitive data
    const userData = { username, email };
    setUser(userData);
    setIsGM(false); // Reset GM status, will be checked separately
    setRememberMe(remember);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(REMEMBER_ME_KEY, String(remember));
    
    // Store CSRF token if provided
    if (csrfTokenValue) {
      setCsrfToken(csrfTokenValue);
    }
  }, []);

  const logout = useCallback(async () => {
    // Call server logout endpoint to destroy session
    try {
      await apiGet("/auth.php?action=logout");
    } catch {
      // Continue with local logout even if server call fails
    }
    
    setUser(null);
    setIsGM(false);
    setRememberMe(false);
    clearCsrfToken();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
  }, []);

  // Check session on mount if user data exists
  useEffect(() => {
    if (user?.username) {
      checkSession();
    }
  }, []); // Only on mount

  // Check GM status when user is available
  useEffect(() => {
    if (user?.username) {
      checkGMStatus();
    } else {
      setIsGM(false);
    }
  }, [user?.username, checkGMStatus]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn: !!user, 
      isGM,
      gmLoading,
      rememberMe,
      login, 
      logout,
      checkGMStatus,
      checkSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
