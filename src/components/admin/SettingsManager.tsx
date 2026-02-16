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
} from 'lucide-react';
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
