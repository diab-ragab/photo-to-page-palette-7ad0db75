import { motion } from "framer-motion";
import { RefreshCw, Circle, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";

interface ServerStatus {
  online: boolean;
  players: number;
  uptime: string;
  accounts: number;
  peakToday: number;
}

interface ServerStatusCardProps {
  apiEndpoint?: string;
  refreshInterval?: number; // in milliseconds
}

export const ServerStatusCard = ({ 
  apiEndpoint = "", 
  refreshInterval = 30000 
}: ServerStatusCardProps) => {
  const [status, setStatus] = useState<ServerStatus>({
    online: false,
    players: 0,
    uptime: "0h",
    accounts: 0,
    peakToday: 0,
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!apiEndpoint) {
      // Demo mode - show mock data
      setStatus({
        online: true,
        players: Math.floor(Math.random() * 500) + 100,
        uptime: "4d 12h",
        accounts: 2845,
        peakToday: 120,
      });
      setLastUpdated(new Date());
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiEndpoint, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setStatus({
          online: data.online ?? true,
          players: data.players ?? data.online_players ?? 0,
          uptime: data.uptime ?? "N/A",
          accounts: data.accounts ?? data.total_accounts ?? 0,
          peakToday: data.peak_today ?? data.peakToday ?? 0,
        });
      } else {
        setStatus(prev => ({ ...prev, online: false }));
      }
    } catch {
      // Silent fail in production - backend may be temporarily unreachable
      setStatus(prev => ({ ...prev, online: false }));
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshInterval]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-display font-semibold">Server Status</span>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
            status.online 
              ? "bg-primary/20 text-primary" 
              : "bg-destructive/20 text-destructive"
          }`}>
            {status.online ? (
              <>
                <Wifi className="w-3 h-3" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                Offline
              </>
            )}
          </span>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="p-1.5 rounded-md hover:bg-secondary/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Players</p>
          <p className="text-2xl font-bold font-display text-primary">
            {status.online ? status.players.toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Uptime</p>
          <p className="text-2xl font-bold font-display">
            {status.online ? status.uptime : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Accounts</p>
          <p className="text-lg font-bold font-display">
            {status.accounts.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Peak Today</p>
          <p className="text-lg font-bold font-display">
            {status.peakToday.toLocaleString()}
          </p>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-[10px] text-muted-foreground text-center mb-3">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      <div className="flex gap-2">
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1 text-[10px] md:text-xs px-2"
          onClick={fetchStatus}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-[10px] md:text-xs px-2">
          View Details
        </Button>
      </div>
    </motion.div>
  );
};
