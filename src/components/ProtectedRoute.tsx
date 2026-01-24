import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { AppLoadingSkeleton } from "@/components/AppLoadingSkeleton";

interface ProtectedRouteProps {
  children: ReactNode;
}

const STORAGE_KEY = "woi_user";

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const [gracePeriodExpired, setGracePeriodExpired] = useState(false);

  // If we have persisted user data, give the auth context a moment to hydrate
  // before redirecting (prevents a brief empty render / black screen after login).
  const hasPersistedUser = (() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (isLoggedIn || !hasPersistedUser) {
      setGracePeriodExpired(false);
      return;
    }

    const t = window.setTimeout(() => setGracePeriodExpired(true), 2000);
    return () => window.clearTimeout(t);
  }, [isLoggedIn, hasPersistedUser]);

  if (!isLoggedIn && hasPersistedUser && !gracePeriodExpired) {
    // Handle trailing slashes and child dashboard routes (e.g. /dashboard/)
    if (location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/")) {
      return <DashboardSkeleton />;
    }

    return <AppLoadingSkeleton />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
