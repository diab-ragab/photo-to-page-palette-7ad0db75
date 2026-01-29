import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isLoggedIn, isAdmin, adminLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      // If not logged in, redirect immediately
      if (!isLoggedIn) {
        setAllowed(false);
        setChecking(false);
        return;
      }

      // Wait for admin loading to complete
      if (adminLoading) {
        return;
      }

      // Double-check with backend
      try {
        const token = localStorage.getItem("woi_session_token") || "";
        
        if (!token) {
          console.log("[AdminRoute] No session token found");
          setAllowed(false);
          setChecking(false);
          return;
        }

        const res = await fetch("https://woiendgame.online/api/check_admin.php", {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Session-Token": token,
            "Authorization": `Bearer ${token}`,
          },
        });

        const data = await res.json().catch(() => ({}));
        console.log("[AdminRoute] Admin check response:", res.status, data);
        
        const adminStatus = res.ok && (data.is_admin === true || data.is_gm === true);
        setAllowed(adminStatus);
      } catch (error) {
        console.error("[AdminRoute] Admin check error:", error);
        setAllowed(false);
      } finally {
        setChecking(false);
      }
    };

    verifyAdmin();
  }, [isLoggedIn, isAdmin, adminLoading]);

  // Show loading spinner while checking
  if (checking || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to home
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // Not admin - redirect to dashboard
  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
