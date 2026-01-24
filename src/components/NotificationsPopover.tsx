import { useState, useEffect } from "react";
import { Bell, Megaphone, Wrench, Calendar, Sparkles, X, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, Notification } from "@/lib/notificationsApi";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const typeIcons = {
  news: Megaphone,
  update: Sparkles,
  maintenance: Wrench,
  event: Calendar,
};

const typeConfig = {
  news: {
    gradient: "from-blue-500 to-cyan-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    text: "text-blue-400",
  },
  update: {
    gradient: "from-emerald-500 to-teal-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    text: "text-emerald-400",
  },
  maintenance: {
    gradient: "from-orange-500 to-amber-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.3)]",
    text: "text-orange-400",
  },
  event: {
    gradient: "from-purple-500 to-pink-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    text: "text-purple-400",
  },
};

export const NotificationsPopover = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [readIds, setReadIds] = useState<number[]>(() => {
    const saved = localStorage.getItem("woi_read_notifications");
    if (!saved) return [];
    try {
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((n): n is number => typeof n === "number");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      const data = await notificationsApi.getAll();
      setNotifications(Array.isArray(data) ? data : []);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markAsRead = (id: number) => {
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id];
      setReadIds(newReadIds);
      localStorage.setItem("woi_read_notifications", JSON.stringify(newReadIds));
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("woi_read_notifications", JSON.stringify(allIds));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setSelectedNotification(notification);
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative group"
          >
            <Bell className="h-5 w-5 transition-transform group-hover:scale-110 group-hover:rotate-12" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-primary to-hdr-purple text-primary-foreground text-xs flex items-center justify-center font-bold shadow-[0_0_12px_rgba(0,255,200,0.5)]"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 p-0 border-border/50 bg-card/95 backdrop-blur-xl overflow-hidden"
          align="end"
        >
          {/* Header with gradient border */}
          <div className="relative">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg">Notifications</h3>
              </div>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[420px]">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="relative inline-block">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <div className="absolute inset-0 blur-2xl bg-primary/10 rounded-full" />
                </div>
                <p className="text-muted-foreground font-medium">No notifications yet</p>
                <p className="text-muted-foreground/60 text-sm mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                <AnimatePresence>
                  {notifications.map((notification, index) => {
                    const Icon = typeIcons[notification.type] || Megaphone;
                    const config = typeConfig[notification.type] || typeConfig.news;
                    const isUnread = !readIds.includes(notification.id);

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`
                          relative group p-4 rounded-xl cursor-pointer
                          transition-all duration-300 ease-out
                          border ${isUnread ? config.border : 'border-transparent'}
                          ${isUnread ? config.bg : 'hover:bg-accent/30'}
                          hover:scale-[1.02] hover:${config.glow}
                        `}
                      >
                        {/* Unread indicator glow */}
                        {isUnread && (
                          <div className={`absolute inset-0 rounded-xl ${config.bg} opacity-50 blur-xl pointer-events-none`} />
                        )}
                        
                        <div className="relative flex gap-3">
                          {/* Icon with gradient */}
                          <div className={`
                            relative p-2.5 rounded-xl bg-gradient-to-br ${config.gradient}
                            shadow-lg transition-transform duration-300 group-hover:scale-110
                          `}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-semibold text-sm ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isUnread && (
                                  <motion.span 
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className={`h-2 w-2 rounded-full bg-gradient-to-r ${config.gradient}`}
                                  />
                                )}
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge 
                                variant="outline" 
                                className={`text-xs capitalize ${config.text} ${config.border} ${config.bg}`}
                              >
                                {notification.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {notification.created_at &&
                                  formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                  })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Detail Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="sm:max-w-lg border-border/50 bg-card/95 backdrop-blur-xl overflow-hidden p-0">
          {selectedNotification && (
            <>
              {/* Header gradient based on type */}
              <div className={`relative h-24 bg-gradient-to-br ${typeConfig[selectedNotification.type]?.gradient || typeConfig.news.gradient}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_50%)]" />
                </div>
                
                {/* Icon centered */}
                <div className="absolute -bottom-6 left-6">
                  <div className={`
                    p-4 rounded-2xl bg-gradient-to-br ${typeConfig[selectedNotification.type]?.gradient || typeConfig.news.gradient}
                    shadow-xl border-4 border-card
                  `}>
                    {(() => {
                      const Icon = typeIcons[selectedNotification.type] || Megaphone;
                      return <Icon className="h-6 w-6 text-white" />;
                    })()}
                  </div>
                </div>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white"
                  onClick={() => setSelectedNotification(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 pt-10">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${typeConfig[selectedNotification.type]?.text} ${typeConfig[selectedNotification.type]?.border} ${typeConfig[selectedNotification.type]?.bg}`}
                    >
                      {selectedNotification.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedNotification.created_at && 
                        format(new Date(selectedNotification.created_at), 'PPP • p')}
                    </span>
                  </div>
                  <DialogTitle className="font-display text-xl">
                    {selectedNotification.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>

                  {selectedNotification.created_by && (
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground/70">
                        Posted by <span className="font-medium text-muted-foreground">{selectedNotification.created_by}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
