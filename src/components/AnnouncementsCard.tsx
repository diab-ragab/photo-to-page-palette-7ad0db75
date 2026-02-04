import { motion } from "framer-motion";
import { Megaphone, Sparkles, Wrench, Gift, ExternalLink, Bell, Calendar, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { notificationsApi, Notification } from "@/lib/notificationsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { LucideIcon } from "lucide-react";

const getNotificationIcon = (type: string): LucideIcon => {
  switch (type) {
    case 'event':
      return Sparkles;
    case 'maintenance':
      return Wrench;
    case 'reward':
      return Gift;
    case 'warning':
      return AlertTriangle;
    case 'update':
      return Calendar;
    default:
      return Bell;
  }
};

export const AnnouncementsCard = () => {
  const [announcements, setAnnouncements] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const data = await notificationsApi.getAll();
        // Ensure data is an array before slicing
        const items = Array.isArray(data) ? data : [];
        // Get the latest 4 announcements
        setAnnouncements(items.slice(0, 4));
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };
    loadAnnouncements();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <span className="text-sm font-display font-semibold">Announcements</span>
        </div>
        <a href="/blog" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          View All <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-2.5 rounded-lg bg-secondary/30">
                <div className="flex items-start gap-2">
                  <Skeleton className="w-6 h-6 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-3/4 mb-1" />
                    <Skeleton className="h-2 w-full mb-1" />
                    <Skeleton className="h-2 w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : announcements.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No announcements yet</p>
        ) : (
          announcements.map((item) => {
            const Icon = getNotificationIcon(item.type);
            return (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-foreground mb-0.5">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-[9px] text-muted-foreground/60 mt-1 block">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
