import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/apiFetch";

export interface User {
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  rememberMe: boolean;
  login: (username: string, email: string, rememberMe?: boolean) => void;
  logout: () => void;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Security: Only store non-sensitive user data in localStorage
// Admin status is NEVER stored client-side - always fetched from server
const STORAGE_KEY = "woi_user";
const REMEMBER_ME_KEY = "woi_remember_me";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      // Security: Only restore username and email, never trust stored isAdmin
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
  
  const [adminLoading, setAdminLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) === "true";
    } catch {
      return false;
    }
  });

  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    if (!user?.username) {
      setIsAdmin(false);
      return false;
    }

    setAdminLoading(true);
    try {
      
      
      console.log("[Auth] Checking admin status for:", user.username);
      
      const response = await fetch(
        `https://woiendgame.online/api/check_admin.php`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            ...getAuthHeaders(),
          },
        }
      );
      
      console.log("[Auth] Admin check response status:", response.status);
      
      if (!response.ok) {
        throw new Error("Admin check failed");
      }
      
      const data = await response.json();
      console.log("[Auth] Admin check response data:", data);
      
      // Security: Admin status is stored in state only, never in localStorage
      const adminStatus = !!(data.is_admin || data.is_gm);
      console.log("[Auth] Admin status determined:", adminStatus);
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      // Security: Fail closed - if admin check fails, treat as non-admin
      console.error("[Auth] Admin check error:", error);
      setIsAdmin(false);
      return false;
    } finally {
      setAdminLoading(false);
    }
  }, [user?.username]);

  const login = useCallback((username: string, email: string, remember: boolean = false) => {
    // Security: Only store non-sensitive data
    const userData = { username, email };
    setUser(userData);
    setIsAdmin(false); // Reset admin status, will be checked separately
    setRememberMe(remember);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(REMEMBER_ME_KEY, String(remember));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAdmin(false);
    setRememberMe(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem("woi_session_token");
  }, []);

  // Check admin status when user is available
  useEffect(() => {
    if (user?.username) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [user?.username, checkAdminStatus]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn: !!user, 
      isAdmin,
      adminLoading,
      rememberMe,
      login, 
      logout,
      checkAdminStatus
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
