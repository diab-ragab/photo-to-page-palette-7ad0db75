import { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { getSiteSettings } from "@/lib/siteSettingsApi";

/** Countdown that uses admin-configured end time, or falls back to midnight UTC */
export const FlashSaleCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [ended, setEnded] = useState(false);
  const [endMs, setEndMs] = useState<number | null>(null);

  // Fetch configured end time once
  useEffect(() => {
    getSiteSettings().then((s) => {
      if (s.flash_sale_end) {
        // Value is "YYYY-MM-DDTHH:MM" treated as UTC
        const parsed = new Date(s.flash_sale_end + "Z").getTime();
        if (!isNaN(parsed)) {
          setEndMs(parsed);
          return;
        }
      }
      // Fallback: next midnight UTC
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      setEndMs(midnight.getTime());
    });
  }, []);

  useEffect(() => {
    if (endMs === null) return;

    const calc = () => {
      const diff = Math.max(0, endMs - Date.now());
      if (diff === 0) { setEnded(true); return { h: 0, m: 0, s: 0 }; }
      setEnded(false);
      return {
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      };
    };
    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [endMs]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (endMs === null) return null; // loading

  if (ended) {
    return (
      <div className="flex items-center gap-2 text-sm font-display text-muted-foreground">
        <Timer className="w-4 h-4" />
        <span>Sale ended</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm font-display">
      <Timer className="w-4 h-4 text-hdr-orange animate-pulse" />
      <span className="text-muted-foreground">Ends in</span>
      <div className="flex gap-1">
        {[
          { v: timeLeft.h, l: "h" },
          { v: timeLeft.m, l: "m" },
          { v: timeLeft.s, l: "s" },
        ].map(({ v, l }) => (
          <span key={l} className="inline-flex items-center gap-0.5">
            <span className="bg-hdr-orange/15 text-hdr-orange px-1.5 py-0.5 rounded font-bold tabular-nums text-xs">
              {pad(v)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">{l}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
