import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Trophy, Plus, Pencil, Trash2, Users, Gift, Medal, Crown, 
  Star, Coins, Eye, EyeOff, RefreshCw 
} from "lucide-react";
import { achievementsApi, Achievement, AchievementRarity, AchievementCategory, RequirementType } from "@/lib/achievementsApi";

const iconOptions = [
  "TROPHY", "STAR", "CROWN", "MEDAL", "FIRE", "BOLT", "GEM", "COIN", 
  "GIFT", "HEART", "SHIELD", "SWORD", "VOTE", "SPARKLE", "TARGET"
];

const iconEmoji: Record<string, string> = {
  TROPHY: "🏆", STAR: "⭐", CROWN: "👑", MEDAL: "🎖️", FIRE: "🔥",
  BOLT: "⚡", GEM: "💎", COIN: "💰", GIFT: "🎁", HEART: "❤️",
  SHIELD: "🛡️", SWORD: "🗡️", VOTE: "🗳️", SPARKLE: "💫", TARGET: "🎯",
};

const rarityColors: Record<string, string> = {
  common: "text-slate-400 border-slate-500/40",
  uncommon: "text-emerald-400 border-emerald-500/40",
  rare: "text-cyan-400 border-cyan-500/40",
  epic: "text-purple-400 border-purple-500/40",
  legendary: "text-amber-400 border-amber-500/40",
};

interface AchievementFormData {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirement_type: RequirementType;
  requirement_value: number;
  reward_coins: number;
  reward_vip: number;
  rarity: AchievementRarity;
  is_hidden: boolean;
  is_active: boolean;
  sort_order: number;
}

const defaultFormData: AchievementFormData = {
  code: "",
  name: "",
  description: "",
  icon: "TROPHY",
  category: "gameplay",
  requirement_type: "count",
  requirement_value: 1,
  reward_coins: 100,
  reward_vip: 50,
  rarity: "common",
  is_hidden: false,
  is_active: true,
  sort_order: 0,
};

// Standalone form component to prevent re-mounting
const AchievementForm = ({
  formData,
  setFormData,
}: {
  formData: AchievementFormData;
  setFormData: React.Dispatch<React.SetStateAction<AchievementFormData>>;
}) => {
  return (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code (unique)</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="first_vote"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="First Vote"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Cast your first vote for the server"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <Select value={formData.icon} onValueChange={(v) => setFormData(prev => ({ ...prev, icon: v }))}>
            <SelectTrigger>
              <SelectValue>
                <span className="flex items-center gap-2">
                  {iconEmoji[formData.icon]} {formData.icon}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map(icon => (
                <SelectItem key={icon} value={icon}>
                  <span className="flex items-center gap-2">
                    {iconEmoji[icon]} {icon}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v as AchievementCategory }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="voting">Voting</SelectItem>
              <SelectItem value="purchases">Purchases</SelectItem>
              <SelectItem value="gameplay">Gameplay</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="events">Events</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Rarity</Label>
          <Select value={formData.rarity} onValueChange={(v) => setFormData(prev => ({ ...prev, rarity: v as AchievementRarity }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="uncommon">Uncommon</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Requirement Type</Label>
          <Select value={formData.requirement_type} onValueChange={(v) => setFormData(prev => ({ ...prev, requirement_type: v as RequirementType }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="streak">Streak</SelectItem>
              <SelectItem value="level">Level</SelectItem>
              <SelectItem value="spend">Spend (Zen)</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="requirement_value">Requirement Value</Label>
          <Input
            id="requirement_value"
            type="number"
            min={1}
            value={formData.requirement_value}
            onChange={(e) => setFormData(prev => ({ ...prev, requirement_value: parseInt(e.target.value) || 1 }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input
            id="sort_order"
            type="number"
            min={0}
            value={formData.sort_order}
            onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reward_coins">Reward Coins</Label>
          <Input
            id="reward_coins"
            type="number"
            min={0}
            value={formData.reward_coins}
            onChange={(e) => setFormData(prev => ({ ...prev, reward_coins: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reward_vip">Reward VIP Points</Label>
          <Input
            id="reward_vip"
            type="number"
            min={0}
            value={formData.reward_vip}
            onChange={(e) => setFormData(prev => ({ ...prev, reward_vip: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="is_hidden"
            checked={formData.is_hidden}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_hidden: v }))}
          />
          <Label htmlFor="is_hidden">Hidden (secret achievement)</Label>
        </div>
      </div>
    </div>
  );
};

export const AchievementsManager = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AchievementFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{
    total_achievements: number;
    users_with_achievements: number;
    total_unlocks: number;
    total_claimed: number;
  } | null>(null);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const data = await achievementsApi.adminListAll();
      setAchievements(data);
    } catch (e) {
      toast.error("Failed to load achievements");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await achievementsApi.adminGetStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  };

  useEffect(() => {
    fetchAchievements();
    fetchStats();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setShowDialog(true);
  };

  const handleEdit = (ach: Achievement) => {
    setEditingId(ach.id);
    setFormData({
      code: ach.code,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      category: ach.category,
      requirement_type: ach.requirement_type,
      requirement_value: ach.requirement_value,
      reward_coins: ach.reward_coins,
      reward_vip: ach.reward_vip,
      rarity: ach.rarity,
      is_hidden: ach.is_hidden === 1,
      is_active: ach.is_active === 1,
      sort_order: ach.sort_order,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error("Code and name are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        is_hidden: formData.is_hidden ? 1 : 0,
        is_active: formData.is_active ? 1 : 0,
      };

      if (editingId) {
        const success = await achievementsApi.adminUpdate(editingId, payload);
        if (success) {
          toast.success("Achievement updated");
          setShowDialog(false);
          fetchAchievements();
        } else {
          toast.error("Failed to update");
        }
      } else {
        const result = await achievementsApi.adminAdd(payload);
        if (result.success) {
          toast.success("Achievement created");
          setShowDialog(false);
          fetchAchievements();
        } else {
          toast.error(result.error || "Failed to create");
        }
      }
    } catch (e) {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this achievement? This will also remove all user progress for it.")) return;

    try {
      const success = await achievementsApi.adminDelete(id);
      if (success) {
        toast.success("Achievement deleted");
        fetchAchievements();
      } else {
        toast.error("Failed to delete");
      }
    } catch (e) {
      toast.error("Connection error");
    }
  };

  const handleToggleActive = async (ach: Achievement) => {
    try {
      const success = await achievementsApi.adminUpdate(ach.id, { is_active: ach.is_active === 1 ? 0 : 1 });
      if (success) {
        fetchAchievements();
      }
    } catch (e) {
      toast.error("Failed to toggle");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-400" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_achievements || 0}</p>
                <p className="text-xs text-muted-foreground">Achievements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-cyan-600/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.users_with_achievements || 0}</p>
                <p className="text-xs text-muted-foreground">Players w/ Achievements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Medal className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_unlocks || 0}</p>
                <p className="text-xs text-muted-foreground">Total Unlocks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_claimed || 0}</p>
                <p className="text-xs text-muted-foreground">Rewards Claimed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Manage Achievements
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAchievements}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleAdd} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" />
              Add Achievement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Achievement</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Rewards</TableHead>
                  <TableHead className="text-center">Unlocks</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : achievements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No achievements yet. Add your first one!
                    </TableCell>
                  </TableRow>
                ) : (
                  achievements.map((ach, index) => (
                    <TableRow key={ach.id} className={ach.is_active !== 1 ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{iconEmoji[ach.icon] || "🏆"}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ach.name}</span>
                              <Badge variant="outline" className={`text-[10px] ${rarityColors[ach.rarity]}`}>
                                {ach.rarity}
                              </Badge>
                              {ach.is_hidden === 1 && (
                                <EyeOff className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {ach.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ach.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {ach.requirement_type}: {ach.requirement_value.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          {ach.reward_coins > 0 && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <Coins className="h-3 w-3" /> {ach.reward_coins.toLocaleString()}
                            </span>
                          )}
                          {ach.reward_vip > 0 && (
                            <span className="flex items-center gap-1 text-purple-400">
                              <Crown className="h-3 w-3" /> {ach.reward_vip.toLocaleString()}
                            </span>
                          )}
                          {ach.reward_coins === 0 && ach.reward_vip === 0 && (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {ach.unlock_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={ach.is_active === 1}
                          onCheckedChange={() => handleToggleActive(ach)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(ach)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ach.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              {editingId ? "Edit Achievement" : "Add Achievement"}
            </DialogTitle>
          </DialogHeader>
          
          <AchievementForm formData={formData} setFormData={setFormData} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
