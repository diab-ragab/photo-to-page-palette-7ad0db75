import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Settings, 
  MessageCircle, 
  Download, 
  Save, 
  RefreshCw,
  ExternalLink,
  Cloud,
  HardDrive,
  FileArchive,
  Users,
  Timer,
  Crown,
  Video,
  CalendarDays,
  RotateCcw,
} from 'lucide-react';
import { getSiteSettings, updateSiteSettings, clearSettingsCache, type SiteSettings } from '@/lib/siteSettingsApi';
import { apiPost, getAuthHeaders, API_BASE } from '@/lib/apiFetch';

export const SettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingSeason, setResettingSeason] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    discord_link: '',
    discord_members: '',
    download_mega: '',
    download_gdrive: '',
    download_filefm: '',
    flash_sale_end: '',
    gamepass_premium_price: '999',
    game_trailer_url: '',
    gamepass_season_start: '',
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getSiteSettings(true);
      setSettings(data);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateSiteSettings(settings);
      if (result.success) {
        toast.success('Settings saved successfully!');
        clearSettingsCache();
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof SiteSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleResetSeason = async () => {
    if (!confirm('Are you sure you want to reset the season? This will start a new Season from today. All current season claims will become invalid.')) return;
    setResettingSeason(true);
    try {
      const res = await fetch(`${API_BASE}/gamepass_admin.php?action=reset_season`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Season reset! Now on Season ${data.season_number || 'new'}`);
        fetchSettings();
      } else {
        toast.error(data.error || 'Failed to reset season');
      }
    } catch {
      toast.error('Failed to reset season');
    } finally {
      setResettingSeason(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Discord Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#5865F2]/20">
              <MessageCircle className="h-5 w-5 text-[#5865F2]" />
            </div>
            Discord Settings
          </CardTitle>
          <CardDescription>
            Configure the Discord invite link and member count displayed on the site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="discord_link" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                Discord Invite Link
              </Label>
              <Input
                id="discord_link"
                value={settings.discord_link}
                onChange={e => handleChange('discord_link', e.target.value)}
                placeholder="https://discord.gg/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord_members" className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Member Count Display
              </Label>
              <Input
                id="discord_members"
                value={settings.discord_members}
                onChange={e => handleChange('discord_members', e.target.value)}
                placeholder="15,403 Members"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Download className="h-5 w-5 text-primary" />
            </div>
            Download Links
          </CardTitle>
          <CardDescription>
            Configure the game client download links shown in the download modal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="download_mega" className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-red-500" />
              MEGA Link
            </Label>
            <Input
              id="download_mega"
              value={settings.download_mega}
              onChange={e => handleChange('download_mega', e.target.value)}
              placeholder="https://mega.nz/..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="download_gdrive" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-blue-500" />
              Google Drive Link
            </Label>
            <Input
              id="download_gdrive"
              value={settings.download_gdrive}
              onChange={e => handleChange('download_gdrive', e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="download_filefm" className="flex items-center gap-2">
              <FileArchive className="h-4 w-4 text-emerald-500" />
              File.fm Link
            </Label>
            <Input
              id="download_filefm"
              value={settings.download_filefm}
              onChange={e => handleChange('download_filefm', e.target.value)}
              placeholder="https://files.fm/..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Flash Sale Timer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-hdr-orange/20">
              <Timer className="h-5 w-5 text-hdr-orange" />
            </div>
            Flash Sale Timer
          </CardTitle>
          <CardDescription>
            Set the end date/time for the current flash sale countdown. Leave empty for a daily midnight-UTC reset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flash_sale_end" className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              Sale End (UTC)
            </Label>
            <Input
              id="flash_sale_end"
              type="datetime-local"
              value={settings.flash_sale_end}
              onChange={e => handleChange('flash_sale_end', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Format: YYYY-MM-DDTHH:MM — interpreted as UTC. When the timer expires, the countdown shows "Sale ended".
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Game Pass Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Crown className="h-5 w-5 text-amber-400" />
            </div>
            Game Pass Pricing
          </CardTitle>
          <CardDescription>
            Set the price (in Euro cents) for the Premium Game Pass shown in the shop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gamepass_premium_price" className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400" />
              Premium Price (cents)
            </Label>
            <Input
              id="gamepass_premium_price"
              type="number"
              min={0}
              value={settings.gamepass_premium_price}
              onChange={e => handleChange('gamepass_premium_price', e.target.value)}
              placeholder="999"
            />
            <p className="text-xs text-muted-foreground">
              = €{(parseInt(settings.gamepass_premium_price || '0') / 100).toFixed(2)} per season (30 days)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Game Pass Season */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
            </div>
            Game Pass Season
          </CardTitle>
          <CardDescription>
            The global season auto-rotates every 30 days. You can manually set the start date or reset the season entirely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gamepass_season_start" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Season Start Date
            </Label>
            <Input
              id="gamepass_season_start"
              type="date"
              value={settings.gamepass_season_start}
              onChange={e => handleChange('gamepass_season_start', e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <p className="text-xs text-muted-foreground">
              {settings.gamepass_season_start
                ? `Season started on ${settings.gamepass_season_start}. Auto-rotates every 30 days.`
                : "No anchor set — the server auto-creates a season start on first request."
              }
            </p>
          </div>

          <div className="border-t pt-4">
            <Button
              variant="destructive"
              onClick={handleResetSeason}
              disabled={resettingSeason}
              className="gap-2"
            >
              <RotateCcw className={`h-4 w-4 ${resettingSeason ? 'animate-spin' : ''}`} />
              {resettingSeason ? 'Resetting...' : 'Reset Season Now'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This starts a brand new season from today. All current-season claims become invalid.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Game Trailer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Video className="h-5 w-5 text-red-500" />
            </div>
            Game Trailer
          </CardTitle>
          <CardDescription>
            Set the YouTube video URL displayed on the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game_trailer_url" className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              YouTube Video URL
            </Label>
            <Input
              id="game_trailer_url"
              value={settings.game_trailer_url}
              onChange={e => handleChange('game_trailer_url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={fetchSettings}
          disabled={loading || saving}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90"
        >
          <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-pulse' : ''}`} />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};
