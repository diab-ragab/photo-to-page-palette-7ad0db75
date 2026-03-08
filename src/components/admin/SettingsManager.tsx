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
  Sparkles,
  Video,
  CalendarDays,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getSiteSettings, updateSiteSettings, clearSettingsCache, type SiteSettings } from '@/lib/siteSettingsApi';

export const SettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    discord_link: '',
    discord_members: '',
    download_mega: '',
    download_gdrive: '',
    download_filefm: '',
    flash_sale_end: '',
    gamepass_elite_price: '999',
    gamepass_gold_price: '1999',
    elite_extend_per_day_cents: '0',
    gold_extend_per_day_cents: '0',
    extensions_enabled: '1',
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
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Crown className="h-5 w-5 text-purple-400" />
            </div>
            Game Pass Pricing
          </CardTitle>
          <CardDescription>
            Set the prices (in Euro cents) for Elite and Gold Game Pass tiers shown in the shop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gamepass_elite_price" className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-400" />
                Elite Price (cents)
              </Label>
              <Input
                id="gamepass_elite_price"
                type="number"
                min={0}
                value={settings.gamepass_elite_price}
                onChange={e => handleChange('gamepass_elite_price', e.target.value)}
                placeholder="999"
              />
              <p className="text-xs text-muted-foreground">
                = €{(parseInt(settings.gamepass_elite_price || '0') / 100).toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gamepass_gold_price" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Gold Price (cents)
              </Label>
              <Input
                id="gamepass_gold_price"
                type="number"
                min={0}
                value={settings.gamepass_gold_price}
                onChange={e => handleChange('gamepass_gold_price', e.target.value)}
                placeholder="1999"
              />
              <p className="text-xs text-muted-foreground">
                = €{(parseInt(settings.gamepass_gold_price || '0') / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Extension Per-Day Pricing</p>
              <div className="flex items-center gap-2">
                <Label htmlFor="extensions_enabled" className="text-xs text-muted-foreground">Extensions Enabled</Label>
                <Switch
                  id="extensions_enabled"
                  checked={settings.extensions_enabled === '1'}
                  onCheckedChange={(checked) => handleChange('extensions_enabled', checked ? '1' : '0')}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Set the cost per day when extending a Game Pass. Leave at 0 to auto-calculate (base price ÷ 30). Toggle off to hide extension cards from the shop.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="elite_extend_per_day_cents" className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-purple-400" />
                  Elite Per-Day (cents)
                </Label>
                <Input
                  id="elite_extend_per_day_cents"
                  type="number"
                  min={0}
                  value={settings.elite_extend_per_day_cents}
                  onChange={e => handleChange('elite_extend_per_day_cents', e.target.value)}
                  placeholder="0 = auto"
                />
                <p className="text-xs text-muted-foreground">
                  {parseInt(settings.elite_extend_per_day_cents || '0') > 0
                    ? `= €${(parseInt(settings.elite_extend_per_day_cents) / 100).toFixed(2)}/day — 30 days = €${(parseInt(settings.elite_extend_per_day_cents) * 30 / 100).toFixed(2)}`
                    : `Auto: €${(Math.ceil(parseInt(settings.gamepass_elite_price || '999') / 30) / 100).toFixed(2)}/day`
                  }
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gold_extend_per_day_cents" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Gold Per-Day (cents)
                </Label>
                <Input
                  id="gold_extend_per_day_cents"
                  type="number"
                  min={0}
                  value={settings.gold_extend_per_day_cents}
                  onChange={e => handleChange('gold_extend_per_day_cents', e.target.value)}
                  placeholder="0 = auto"
                />
                <p className="text-xs text-muted-foreground">
                  {parseInt(settings.gold_extend_per_day_cents || '0') > 0
                    ? `= €${(parseInt(settings.gold_extend_per_day_cents) / 100).toFixed(2)}/day — 30 days = €${(parseInt(settings.gold_extend_per_day_cents) * 30 / 100).toFixed(2)}`
                    : `Auto: €${(Math.ceil(parseInt(settings.gamepass_gold_price || '1999') / 30) / 100).toFixed(2)}/day`
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Trailer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
            </div>
            Game Pass Season
          </CardTitle>
          <CardDescription>
            Set the global season anchor date. Every 30 days from this date starts a new season.
            All players share the same season end date. Leave blank to default to the 1st of each month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gamepass_season_start" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Season Anchor Date
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
                ? `Seasons cycle every 30 days from ${settings.gamepass_season_start}. All Game Pass holders in a season share the same end date.`
                : "No anchor set — defaults to the 1st of the current month."
              }
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
            Set the YouTube video URL displayed on the homepage. Paste a full YouTube link (e.g. https://www.youtube.com/watch?v=...).
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
