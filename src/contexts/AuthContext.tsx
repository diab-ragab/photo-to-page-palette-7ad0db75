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

  const checkGMStatus = async (): Promise<boolean> => {
    if (!user?.username) return false;
    
    try {
      const response = await fetch(
        `https://woiendgame.online/api/check_gm.php?user=${encodeURIComponent(user.username)}`
      );
      const data = await response.json();
      
      if (data.is_gm) {
        const updatedUser = { ...user, isGM: true };
        setUser(updatedUser);
        localStorage.setItem("woi_user", JSON.stringify(updatedUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking GM status:", error);
      return false;
    }
  };

  const login = (username: string, email: string) => {
    const userData = { username, email, isGM: false };
    setUser(userData);
    localStorage.setItem("woi_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("woi_user");
  };

  // Check GM status when user logs in
  useEffect(() => {
    if (user?.username && user.isGM === undefined) {
      checkGMStatus();
    }
  }, [user?.username]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn: !!user, 
      isGM: user?.isGM || false,
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
