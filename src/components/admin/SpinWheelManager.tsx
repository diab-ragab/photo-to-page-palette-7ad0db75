import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Sparkles, 
  Plus, 
  Pencil, 
  Trash2, 
  Settings, 
  BarChart3,
  Coins,
  Crown,
  Zap,
  Gift,
  X,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  fetchSpinSettings,
  updateSpinSettings,
  fetchSpinStats,
  type WheelSegment,
  type SpinSettings,
  type SpinStats
} from '@/lib/spinWheelApi';

const REWARD_TYPES = [
  { value: 'coins', label: 'Coins', icon: Coins },
  { value: 'vip', label: 'VIP Points', icon: Crown },
  { value: 'zen', label: 'Zen', icon: Zap },
  { value: 'nothing', label: 'Nothing', icon: X },
];

const ICONS = ['coins', 'crown', 'zap', 'gift', 'x'];

// Format Zen values: 1M for millions, k for thousands
const formatZen = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toLocaleString();
};

const COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', 
  '#ec4899', '#ef4444', '#06b6d4', '#64748b'
];

interface SegmentFormData {
  label: string;
  reward_type: 'coins' | 'vip' | 'zen' | 'nothing';
  reward_value: number;
  probability: number;
  color: string;
  icon: string;
  is_active: number;
  sort_order: number;
}

const defaultFormData: SegmentFormData = {
  label: '',
  reward_type: 'coins',
  reward_value: 100,
  probability: 10,
  color: '#3b82f6',
  icon: 'gift',
  is_active: 1,
  sort_order: 0
};

export function SpinWheelManager() {
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [settings, setSettings] = useState<SpinSettings | null>(null);
  const [stats, setStats] = useState<SpinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [editingSegment, setEditingSegment] = useState<WheelSegment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SegmentFormData>(defaultFormData);
  
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    spins_per_day: '1',
    cooldown_hours: '24',
    enabled: '1',
    zen_per_spin: '50000'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [segs, sets, sts] = await Promise.all([
        fetchAdminSegments(),
        fetchSpinSettings(),
        fetchSpinStats()
      ]);
      setSegments(segs);
      setSettings(sets);
      setStats(sts);
      setSettingsForm({
        spins_per_day: sets.spins_per_day || '1',
        cooldown_hours: sets.cooldown_hours || '24',
        enabled: sets.enabled || '1',
        zen_per_spin: (sets as any).zen_per_spin || '50000'
      });
    } catch (err) {
      console.error('Failed to load wheel data:', err);
      toast.error('Failed to load wheel data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingSegment(null);
    setFormData({
      ...defaultFormData,
      sort_order: segments.length
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (segment: WheelSegment) => {
    setEditingSegment(segment);
    setFormData({
      label: segment.label,
      reward_type: segment.reward_type,
      reward_value: segment.reward_value,
      probability: segment.probability || 10,
      color: segment.color,
      icon: segment.icon,
      is_active: segment.is_active || 1,
      sort_order: segment.sort_order
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.label.trim()) {
      toast.error('Label is required');
      return;
    }

    try {
      setSaving(true);
      
      if (editingSegment) {
        await updateSegment({ ...formData, id: editingSegment.id } as WheelSegment);
        toast.success('Segment updated');
      } else {
        await createSegment(formData as Omit<WheelSegment, 'id'>);
        toast.success('Segment created');
      }
      
      setIsDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save segment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this segment?')) return;
    
    try {
      await deleteSegment(id);
      toast.success('Segment deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete segment');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateSpinSettings(settingsForm);
      toast.success('Settings saved');
      setShowSettings(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spins</p>
                <p className="text-lg font-bold">{stats?.total_spins.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-lg font-bold">{stats?.spins_today || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Coins className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coins Given</p>
                <p className="text-lg font-bold">{(stats?.rewards_given?.coins || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Crown className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">VIP Given</p>
                <p className="text-lg font-bold">{(stats?.rewards_given?.vip || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Zap className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Zen Given</p>
                <p className="text-lg font-bold">{formatZen(stats?.rewards_given?.zen || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Wheel Segments ({segments.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button size="sm" onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Segment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((seg) => (
                <TableRow key={seg.id}>
                  <TableCell>
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-background shadow"
                      style={{ backgroundColor: seg.color }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{seg.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {seg.reward_type === 'nothing' ? (
                        'None'
                      ) : (
                        `${seg.reward_value} ${seg.reward_type}`
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{seg.probability}%</TableCell>
                  <TableCell>
                    <Badge variant={seg.is_active ? 'default' : 'secondary'}>
                      {seg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(seg)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(seg.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {segments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No segments configured. Add at least 2 segments to enable the wheel.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Segment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSegment ? 'Edit Segment' : 'Add Segment'}
            </DialogTitle>
            <DialogDescription>
              Configure the wheel segment and its reward.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., 100 Coins"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reward Type</Label>
                <Select
                  value={formData.reward_type}
                  onValueChange={(v) => setFormData({ ...formData, reward_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REWARD_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        <div className="flex items-center gap-2">
                          <rt.icon className="h-4 w-4" />
                          {rt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Reward Value</Label>
                <Input
                  type="number"
                  value={formData.reward_value}
                  onChange={(e) => setFormData({ ...formData, reward_value: parseInt(e.target.value) || 0 })}
                  disabled={formData.reward_type === 'nothing'}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      formData.color === color ? 'scale-110 border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-8 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active === 1}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked ? 1 : 0 })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spin Wheel Settings</DialogTitle>
            <DialogDescription>
              Configure spin limits and cooldowns.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">Allow users to spin the wheel</p>
              </div>
              <Switch
                checked={settingsForm.enabled === '1'}
                onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, enabled: checked ? '1' : '0' })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Spins Per Day</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={settingsForm.spins_per_day}
                onChange={(e) => setSettingsForm({ ...settingsForm, spins_per_day: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cooldown (Hours)</Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={settingsForm.cooldown_hours}
                onChange={(e) => setSettingsForm({ ...settingsForm, cooldown_hours: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Time before spin count resets
              </p>
            </div>

            <div className="space-y-2">
              <Label>Zen Per Extra Spin</Label>
              <Input
                type="number"
                min="1000"
                value={settingsForm.zen_per_spin}
                onChange={(e) => setSettingsForm({ ...settingsForm, zen_per_spin: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Cost in Zen to buy one extra spin
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
