import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

type Props = { children: React.ReactNode };

export function AdminRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("woi_session_token") || "";
        if (!token) {
          setAllowed(false);
          return;
        }

        const res = await fetch("https://woiendgame.online/api/check_admin.php", {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "X-Session-Token": token,
            "Authorization": `Bearer ${token}`, // backup
          },
        });

        const data = await res.json().catch(() => ({}));
        setAllowed(res.ok && (data.is_admin === true || data.is_gm === true));
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) return null; // أو Spinner
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
