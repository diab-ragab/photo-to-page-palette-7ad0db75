import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { voteStreakApi, VoteStreakTier, VoteStreakTierFormData } from "@/lib/voteStreakApi";
import {
  Plus,
  Trash2,
  Pencil,
  Flame,
  Coins,
  Crown,
  TrendingUp,
  Save,
  X,
  AlertTriangle,
  Award,
} from "lucide-react";

export const VoteStreakManager = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [tiers, setTiers] = useState<VoteStreakTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new tier
  const [newTier, setNewTier] = useState<VoteStreakTierFormData>({
    min_streak: 1,
    max_streak: null,
    multiplier: 1.0,
    bonus_coins: 0,
    bonus_vip: 0,
    badge_name: "",
    badge_icon: "",
    is_active: true,
  });

  // Edit modal state
  const [editingTier, setEditingTier] = useState<VoteStreakTier | null>(null);
  const [editData, setEditData] = useState<VoteStreakTierFormData>({
    min_streak: 1,
    max_streak: null,
    multiplier: 1.0,
    bonus_coins: 0,
    bonus_vip: 0,
    badge_name: "",
    badge_icon: "",
    is_active: true,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    setIsLoading(true);
    const data = await voteStreakApi.getAllTiers();
    setTiers(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newTier.min_streak < 1) {
      toast({
        title: "Error",
        description: "Minimum streak must be at least 1",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const success = await voteStreakApi.addTier(newTier);

    if (success) {
      toast({
        title: "Success",
        description: "Streak tier added!",
      });
      setNewTier({
        min_streak: 1,
        max_streak: null,
        multiplier: 1.0,
        bonus_coins: 0,
        bonus_vip: 0,
        badge_name: "",
        badge_icon: "",
        is_active: true,
      });
      fetchTiers();
    } else {
      // Demo mode: add locally
      setTiers((prev) => [
        ...prev,
        {
          ...newTier,
          id: Date.now(),
          badge_name: newTier.badge_name || null,
          badge_icon: newTier.badge_icon || null,
        },
      ]);
      toast({
        title: "Success (Demo)",
        description: "Streak tier added locally",
      });
      setNewTier({
        min_streak: 1,
        max_streak: null,
        multiplier: 1.0,
        bonus_coins: 0,
        bonus_vip: 0,
        badge_name: "",
        badge_icon: "",
        is_active: true,
      });
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    const success = await voteStreakApi.deleteTier(id);

    if (success) {
      toast({
        title: "Deleted",
        description: "Streak tier removed.",
      });
      fetchTiers();
    } else {
      // Demo mode: remove locally
      setTiers((prev) => prev.filter((t) => t.id !== id));
      toast({
        title: "Deleted (Demo)",
        description: "Streak tier removed locally",
      });
    }
  };

  const handleEdit = (tier: VoteStreakTier) => {
    setEditingTier(tier);
    setEditData({
      min_streak: tier.min_streak,
      max_streak: tier.max_streak,
      multiplier: tier.multiplier,
      bonus_coins: tier.bonus_coins,
      bonus_vip: tier.bonus_vip,
      badge_name: tier.badge_name || "",
      badge_icon: tier.badge_icon || "",
      is_active: tier.is_active,
    });
  };

  const handleCloseEdit = () => {
    setEditingTier(null);
  };

  const handleUpdate = async () => {
    if (!editingTier) return;

    setIsUpdating(true);

    const success = await voteStreakApi.updateTier(editingTier.id, editData);

    if (success) {
      toast({
        title: "Success",
        description: "Streak tier updated!",
      });
      fetchTiers();
      handleCloseEdit();
    } else {
      // Demo mode: update locally
      setTiers((prev) =>
        prev.map((t) =>
          t.id === editingTier.id
            ? {
                ...t,
                ...editData,
                badge_name: editData.badge_name || null,
                badge_icon: editData.badge_icon || null,
              }
            : t
        )
      );
      toast({
        title: "Success (Demo)",
        description: "Streak tier updated locally",
      });
      handleCloseEdit();
    }

    setIsUpdating(false);
  };

  const handleToggleActive = async (id: number, is_active: boolean) => {
    const success = await voteStreakApi.toggleTier(id, is_active);

    if (!success) {
      // Demo mode: toggle locally
      setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, is_active } : t)));
    } else {
      fetchTiers();
    }
  };

  const formatStreakRange = (min: number, max: number | null) => {
    if (max === null) return `${min}+ days`;
    if (min === max) return `${min} day${min !== 1 ? "s" : ""}`;
    return `${min}-${max} days`;
  };

  const EditModalContent = () => {
    if (!editingTier) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Min Streak</label>
            <Input
              type="number"
              min="1"
              value={editData.min_streak}
              onChange={(e) => setEditData({ ...editData, min_streak: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Max Streak</label>
            <Input
              type="number"
              placeholder="∞"
              value={editData.max_streak || ""}
              onChange={(e) =>
                setEditData({ ...editData, max_streak: e.target.value ? parseInt(e.target.value) : null })
              }
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Multiplier (e.g., 1.5 = 1.5x)</label>
          <Input
            type="number"
            step="0.25"
            min="1"
            value={editData.multiplier}
            onChange={(e) => setEditData({ ...editData, multiplier: parseFloat(e.target.value) || 1 })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Bonus Coins</label>
            <Input
              type="number"
              value={editData.bonus_coins}
              onChange={(e) => setEditData({ ...editData, bonus_coins: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Bonus VIP</label>
            <Input
              type="number"
              value={editData.bonus_vip}
              onChange={(e) => setEditData({ ...editData, bonus_vip: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Badge Name</label>
            <Input
              placeholder="e.g., Week Warrior"
              value={editData.badge_name}
              onChange={(e) => setEditData({ ...editData, badge_name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Badge Icon</label>
            <Input
              placeholder="e.g., ⭐"
              value={editData.badge_icon}
              onChange={(e) => setEditData({ ...editData, badge_icon: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Active</label>
          <Switch
            checked={editData.is_active}
            onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleUpdate} disabled={isUpdating} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={handleCloseEdit}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Add New Tier Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Add Streak Tier
          </CardTitle>
          <CardDescription>Configure bonus rewards for vote streaks</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Min Streak</label>
                <Input
                  type="number"
                  min="1"
                  value={newTier.min_streak}
                  onChange={(e) => setNewTier({ ...newTier, min_streak: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max Streak</label>
                <Input
                  type="number"
                  placeholder="∞ (leave empty)"
                  value={newTier.max_streak || ""}
                  onChange={(e) =>
                    setNewTier({ ...newTier, max_streak: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" /> Multiplier
                </label>
                <Input
                  type="number"
                  step="0.25"
                  min="1"
                  value={newTier.multiplier}
                  onChange={(e) => setNewTier({ ...newTier, multiplier: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-yellow-500" /> Bonus Coins
                </label>
                <Input
                  type="number"
                  value={newTier.bonus_coins}
                  onChange={(e) => setNewTier({ ...newTier, bonus_coins: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-purple-400" /> Bonus VIP
                </label>
                <Input
                  type="number"
                  value={newTier.bonus_vip}
                  onChange={(e) => setNewTier({ ...newTier, bonus_vip: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" /> Badge Name
                </label>
                <Input
                  placeholder="e.g., Week Warrior"
                  value={newTier.badge_name}
                  onChange={(e) => setNewTier({ ...newTier, badge_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Badge Icon</label>
                <Input
                  placeholder="e.g., ⭐ 🔥 💎 👑"
                  value={newTier.badge_icon}
                  onChange={(e) => setNewTier({ ...newTier, badge_icon: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Adding..." : "Add Tier"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Streak Tiers List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            Streak Reward Tiers
          </CardTitle>
          <CardDescription>{tiers.length} tier(s) configured</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading streak tiers...</div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No streak tiers configured</p>
            </div>
          ) : isMobile ? (
            /* Mobile: Card-based layout */
            <div className="space-y-3">
              {tiers
                .sort((a, b) => a.min_streak - b.min_streak)
                .map((tier) => (
                  <div
                    key={tier.id}
                    className={`p-3 rounded-lg border bg-card/50 space-y-2 ${!tier.is_active ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{formatStreakRange(tier.min_streak, tier.max_streak)}</p>
                          <Badge variant={tier.is_active ? "default" : "secondary"}>
                            {tier.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {tier.badge_name && (
                          <p className="text-xs text-muted-foreground">
                            {tier.badge_icon} {tier.badge_name}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-green-500">
                            <TrendingUp className="h-3 w-3" /> {tier.multiplier}x
                          </span>
                          <span className="flex items-center gap-1 text-yellow-500">
                            <Coins className="h-3 w-3" /> +{tier.bonus_coins}
                          </span>
                          <span className="flex items-center gap-1 text-purple-400">
                            <Crown className="h-3 w-3" /> +{tier.bonus_vip}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tier)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            /* Desktop: Table layout */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Streak Range</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>Bonus Coins</TableHead>
                  <TableHead>Bonus VIP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers
                  .sort((a, b) => a.min_streak - b.min_streak)
                  .map((tier) => (
                    <TableRow key={tier.id} className={!tier.is_active ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {formatStreakRange(tier.min_streak, tier.max_streak)}
                      </TableCell>
                      <TableCell>
                        {tier.badge_name ? (
                          <span className="flex items-center gap-1">
                            <span>{tier.badge_icon}</span>
                            <span className="text-sm">{tier.badge_name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-500 font-medium">{tier.multiplier}x</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-500">+{tier.bonus_coins}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-purple-400">+{tier.bonus_vip}</span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={tier.is_active}
                          onCheckedChange={(checked) => handleToggleActive(tier.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tier)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(tier.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal/Drawer */}
      {isMobile ? (
        <Drawer open={!!editingTier} onOpenChange={(open) => !open && handleCloseEdit()}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Streak Tier</DrawerTitle>
              <DrawerDescription>
                Modify the streak tier settings
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <EditModalContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!editingTier} onOpenChange={(open) => !open && handleCloseEdit()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Streak Tier</DialogTitle>
              <DialogDescription>
                Modify the streak tier settings
              </DialogDescription>
            </DialogHeader>
            <EditModalContent />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
