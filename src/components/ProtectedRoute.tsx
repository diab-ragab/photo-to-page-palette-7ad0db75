/**
 * ProtectedRoute - Client-side route guard for UX purposes only.
 * 
 * SECURITY NOTE: This component provides a user experience improvement by 
 * redirecting unauthenticated users to the home page. However, it is NOT 
 * a security mechanism. All actual authorization is enforced server-side:
 * 
 * - The PHP backend validates session cookies on every API request
 * - check_gm.php, notifications.php, gamepass_admin.php, vote_sites.php 
 *   all enforce GM role via requireGM() middleware
 * - Session validation occurs in auth_middleware.php for all protected endpoints
 * 
 * Client-side state (isLoggedIn, isGM) is purely for UI rendering decisions.
 * An attacker bypassing this component gains no additional access because
 * all data operations require valid server-side authentication.
 */
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
};
