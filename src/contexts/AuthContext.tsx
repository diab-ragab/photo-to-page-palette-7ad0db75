import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface User {
  username: string;
  email: string;
  isGM?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isGM: boolean;
  gmLoading: boolean;
  login: (username: string, email: string) => void;
  logout: () => void;
  checkGMStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("woi_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [gmLoading, setGmLoading] = useState(false);

  const checkGMStatus = async (): Promise<boolean> => {
    if (!user?.username) return false;

    setGmLoading(true);
    try {
      const response = await fetch(
        `https://woiendgame.online/api/check_gm.php?user=${encodeURIComponent(user.username)}`
      );
      const data = await response.json();

      const updatedUser = { ...user, isGM: !!data.is_gm };
      setUser(updatedUser);
      localStorage.setItem("woi_user", JSON.stringify(updatedUser));

      return !!data.is_gm;
    } catch (error) {
      console.error("Error checking GM status:", error);
      // Fail closed: if GM check fails, treat as non-GM
      const updatedUser = { ...user, isGM: false };
      setUser(updatedUser);
      localStorage.setItem("woi_user", JSON.stringify(updatedUser));
      return false;
    } finally {
      setGmLoading(false);
    }
  };

  const login = (username: string, email: string) => {
    // Don't assume role on login; fetch it from the server.
    const userData = { username, email };
    setUser(userData);
    localStorage.setItem("woi_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("woi_user");
  };

  // Check GM status when user is available
  useEffect(() => {
    if (user?.username) {
      checkGMStatus();
    }
  }, [user?.username]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn: !!user, 
      isGM: user?.isGM || false,
      gmLoading,
      login, 
      logout,
      checkGMStatus
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
