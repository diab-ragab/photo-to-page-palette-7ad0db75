import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications, NotificationPreferences } from '@/hooks/usePushNotifications';
import { 
  Bell, 
  BellOff, 
  BellRing,
  Flame,
  Gift,
  Calendar,
  Megaphone,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const NotificationSettings = () => {
  const { 
    isSupported, 
    permission, 
    preferences, 
    requestPermission, 
    updatePreferences,
    showNotification 
  } = usePushNotifications();
  const [requesting, setRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    setRequesting(true);
    const granted = await requestPermission();
    setRequesting(false);
    
    if (granted) {
      toast.success('Notifications enabled! 🔔');
      // Send a test notification
      setTimeout(() => {
        showNotification('✅ Notifications Enabled', {
          body: 'You will now receive alerts for streaks, rewards, and events!',
        });
      }, 500);
    } else {
      toast.error('Notification permission denied');
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    updatePreferences({ [key]: !preferences[key] });
  };

  const notificationTypes = [
    {
      key: 'streakExpiring' as const,
      icon: Flame,
      label: 'Streak Expiring',
      description: 'Alert when your vote streak is about to expire',
      color: 'text-orange-400',
    },
    {
      key: 'rewardsReady' as const,
      icon: Gift,
      label: 'Rewards Ready',
      description: 'Notify when Daily Zen, votes, or spins are available',
      color: 'text-cyan-400',
    },
    {
      key: 'eventsStarting' as const,
      icon: Calendar,
      label: 'Events Starting',
      description: 'Alert when in-game events go live',
      color: 'text-purple-400',
    },
    {
      key: 'announcements' as const,
      icon: Megaphone,
      label: 'Announcements',
      description: 'Important news and updates from the team',
      color: 'text-green-400',
    },
  ];

  if (!isSupported) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card via-card to-cyan-950/10 border-cyan-500/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
            <BellRing className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Push Notifications
            </span>
            <CardDescription className="text-xs font-normal mt-0.5">
              Never miss important rewards and events
            </CardDescription>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : permission === 'denied' ? (
              <XCircle className="h-5 w-5 text-red-400" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {permission === 'granted' ? 'Notifications Enabled' : 
                 permission === 'denied' ? 'Notifications Blocked' : 
                 'Notifications Disabled'}
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied' 
                  ? 'Enable in browser settings' 
                  : 'Browser notification status'}
              </p>
            </div>
          </div>
          
          {permission !== 'granted' && permission !== 'denied' && (
            <Button
              size="sm"
              onClick={handleEnableNotifications}
              disabled={requesting}
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
            >
              {requesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-1.5" />
                  Enable
                </>
              )}
            </Button>
          )}
        </div>

        {/* Master Toggle */}
        {permission === 'granted' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-3">
                {preferences.enabled ? (
                  <BellRing className="h-5 w-5 text-cyan-400" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="master-toggle" className="font-medium cursor-pointer">
                    All Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Master switch for all notification types
                  </p>
                </div>
              </div>
              <Switch
                id="master-toggle"
                checked={preferences.enabled}
                onCheckedChange={(checked) => updatePreferences({ enabled: checked })}
              />
            </div>

            {/* Individual Toggles */}
            <div className="space-y-2">
              {notificationTypes.map((type, index) => (
                <motion.div
                  key={type.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30 transition-opacity ${
                    !preferences.enabled ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <type.icon className={`h-4 w-4 ${type.color}`} />
                    <div>
                      <Label 
                        htmlFor={`toggle-${type.key}`} 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {type.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={`toggle-${type.key}`}
                    checked={preferences[type.key]}
                    onCheckedChange={() => handleToggle(type.key)}
                    disabled={!preferences.enabled}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
