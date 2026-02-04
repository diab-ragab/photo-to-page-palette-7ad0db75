import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Send, 
  Bell, 
  Megaphone, 
  AlertTriangle,
  Calendar,
  Gift,
  Flame,
  Loader2,
  CheckCircle2,
  Zap,
  Timer,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationsApi, autoNotificationSettingsApi, AutoNotificationSettings } from '@/lib/notificationsApi';
import { useAuth } from '@/contexts/AuthContext';

type NotificationType = 'announcement' | 'event' | 'reward' | 'streak' | 'maintenance';

interface NotificationTemplate {
  type: NotificationType;
  icon: React.ElementType;
  label: string;
  color: string;
  placeholder: string;
}

const templates: NotificationTemplate[] = [
  { 
    type: 'announcement', 
    icon: Megaphone, 
    label: 'Announcement', 
    color: 'text-green-400',
    placeholder: 'Important news for all players...'
  },
  { 
    type: 'event', 
    icon: Calendar, 
    label: 'Event Starting', 
    color: 'text-purple-400',
    placeholder: 'A new event is starting...'
  },
  { 
    type: 'reward', 
    icon: Gift, 
    label: 'Reward Available', 
    color: 'text-cyan-400',
    placeholder: 'New rewards are waiting...'
  },
  { 
    type: 'streak', 
    icon: Flame, 
    label: 'Streak Reminder', 
    color: 'text-orange-400',
    placeholder: 'Don\'t lose your streak...'
  },
  { 
    type: 'maintenance', 
    icon: AlertTriangle, 
    label: 'Maintenance', 
    color: 'text-amber-400',
    placeholder: 'Server maintenance scheduled...'
  },
];

export const PushNotificationManager = () => {
  const { user } = useAuth();
  const [notificationType, setNotificationType] = useState<NotificationType>('announcement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  // Auto-notification settings state
  const [autoSettings, setAutoSettings] = useState<AutoNotificationSettings>({
    daily_zen_enabled: false,
    spin_wheel_enabled: false,
    vote_streak_enabled: false,
    gamepass_enabled: false,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const selectedTemplate = templates.find(t => t.type === notificationType) || templates[0];

  // Load auto-notification settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await autoNotificationSettingsApi.get();
        setAutoSettings(settings);
      } catch {
        // Use defaults
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  const handleToggleAutoSetting = async (key: keyof AutoNotificationSettings) => {
    const newSettings = { ...autoSettings, [key]: !autoSettings[key] };
    setAutoSettings(newSettings);
    setSavingSettings(true);
    
    try {
      const success = await autoNotificationSettingsApi.update(newSettings);
      if (success) {
        toast.success(`Auto-notification ${newSettings[key] ? 'enabled' : 'disabled'}`);
      } else {
        // Revert on failure
        setAutoSettings(autoSettings);
        toast.error('Failed to update settings');
      }
    } catch {
      setAutoSettings(autoSettings);
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in both title and message');
      return;
    }

    setSending(true);
    try {
      // Create a notification in the database
      const success = await notificationsApi.create({
        title: title.trim(),
        message: message.trim(),
        type: notificationType === 'announcement' ? 'news' : 
              notificationType === 'maintenance' ? 'maintenance' : 
              notificationType === 'event' ? 'event' : 'update',
        created_by: user?.username || 'Admin',
      });

      if (success) {
        setSent(true);
        toast.success('Notification sent to all users!');
        
        // Reset form after delay
        setTimeout(() => {
          setTitle('');
          setMessage('');
          setSent(false);
        }, 2000);
      } else {
        toast.error('Failed to send notification');
      }
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleQuickTemplate = (type: NotificationType) => {
    setNotificationType(type);
    
    const quickMessages: Record<NotificationType, { title: string; message: string }> = {
      announcement: { title: '📢 New Update Available!', message: 'Check out the latest features and improvements.' },
      event: { title: '🎮 Event Starting Soon!', message: 'A special event is about to begin. Don\'t miss out!' },
      reward: { title: '🎁 Rewards Waiting!', message: 'Your daily rewards are ready to be claimed!' },
      streak: { title: '🔥 Keep Your Streak!', message: 'Your vote streak is about to expire. Vote now!' },
      maintenance: { title: '🔧 Scheduled Maintenance', message: 'Server maintenance in 1 hour. Save your progress!' },
    };
    
    const template = quickMessages[type];
    setTitle(template.title);
    setMessage(template.message);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
          <Bell className="h-6 w-6 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Push Notification Broadcast</h2>
          <p className="text-sm text-muted-foreground">
            Send notifications to all users
          </p>
        </div>
      </div>

      {/* Quick Templates */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <Button
                key={template.type}
                variant={notificationType === template.type ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickTemplate(template.type)}
                className={notificationType === template.type 
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600' 
                  : ''
                }
              >
                <template.icon className={`h-4 w-4 mr-1.5 ${template.color}`} />
                {template.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compose Notification */}
      <Card className="bg-gradient-to-br from-card via-card to-cyan-950/10 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <selectedTemplate.icon className={`h-5 w-5 ${selectedTemplate.color}`} />
            Compose Notification
          </CardTitle>
          <CardDescription>
            This will be sent to all users with notifications enabled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type Selector */}
          <div className="space-y-2">
            <Label>Notification Type</Label>
            <Select value={notificationType} onValueChange={(v) => setNotificationType(v as NotificationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.type} value={template.type}>
                    <div className="flex items-center gap-2">
                      <template.icon className={`h-4 w-4 ${template.color}`} />
                      {template.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="notification-title">Title</Label>
            <Input
              id="notification-title"
              placeholder="Notification title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="notification-message">Message</Label>
            <Textarea
              id="notification-message"
              placeholder={selectedTemplate.placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
          </div>

          {/* Preview */}
          {(title || message) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Preview</p>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 shrink-0">
                  <selectedTemplate.icon className={`h-4 w-4 ${selectedTemplate.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title || 'Notification Title'}</p>
                  <p className="text-sm text-muted-foreground">{message || 'Notification message...'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Send Button */}
          <Button
            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
            onClick={handleSend}
            disabled={sending || sent || !title.trim() || !message.trim()}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : sent ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Sent!
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to All Users
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Auto-Send Settings */}
      <Card className="bg-gradient-to-br from-card via-card to-purple-950/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-purple-400" />
            Auto-Send Notifications
          </CardTitle>
          <CardDescription>
            Automatically notify all users when rewards become available
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Daily Zen */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Zap className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Daily Zen Ready</p>
                    <p className="text-xs text-muted-foreground">Notify when daily zen reward resets</p>
                  </div>
                </div>
                <Switch
                  checked={autoSettings.daily_zen_enabled}
                  onCheckedChange={() => handleToggleAutoSetting('daily_zen_enabled')}
                  disabled={savingSettings}
                />
              </div>

              {/* Spin Wheel */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Timer className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Spin Wheel Available</p>
                    <p className="text-xs text-muted-foreground">Notify when free spin is ready</p>
                  </div>
                </div>
                <Switch
                  checked={autoSettings.spin_wheel_enabled}
                  onCheckedChange={() => handleToggleAutoSetting('spin_wheel_enabled')}
                  disabled={savingSettings}
                />
              </div>

              {/* Vote Streak */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Flame className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Vote Streak Reminder</p>
                    <p className="text-xs text-muted-foreground">Remind users to maintain their streak</p>
                  </div>
                </div>
                <Switch
                  checked={autoSettings.vote_streak_enabled}
                  onCheckedChange={() => handleToggleAutoSetting('vote_streak_enabled')}
                  disabled={savingSettings}
                />
              </div>

              {/* Game Pass */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Gift className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Game Pass Rewards</p>
                    <p className="text-xs text-muted-foreground">Notify when new daily reward unlocks</p>
                  </div>
                </div>
                <Switch
                  checked={autoSettings.gamepass_enabled}
                  onCheckedChange={() => handleToggleAutoSetting('gamepass_enabled')}
                  disabled={savingSettings}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted/20 border-border/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How it works</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Notifications are saved to the database and shown in the notification bell</li>
                <li>Users with browser notifications enabled will receive push alerts</li>
                <li>Auto-send creates notifications when rewards reset (daily at midnight server time)</li>
                <li>Use sparingly to avoid notification fatigue</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
