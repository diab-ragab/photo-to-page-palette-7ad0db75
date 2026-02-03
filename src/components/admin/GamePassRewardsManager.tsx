import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Gift, Crown, Plus, Pencil, Trash2, Save, X, Coins, Gem, Package } from "lucide-react";

export interface GamePassReward {
  id?: number;
  day: number;
  tier: "free" | "elite";
  item_id: number;
  item_name: string;
  quantity: number;
  coins: number;
  zen: number;
  exp: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string;
}

interface GamePassRewardsManagerProps {
  username?: string;
}

const rarityOptions = [
  { value: "common", label: "Common", color: "text-muted-foreground" },
  { value: "rare", label: "Rare", color: "text-blue-500" },
  { value: "epic", label: "Epic", color: "text-purple-500" },
  { value: "legendary", label: "Legendary", color: "text-amber-500" },
];

const iconOptions = ["🪙", "💰", "⭐", "🌟", "🧪", "💧", "⚡", "📦", "🗡️", "🔥", "🛡️", "✨", "🥚", "🐉", "🎁", "💎", "👑", "🏆"];

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const sessionToken = localStorage.getItem("woi_session_token") || "";
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Session-Token": sessionToken,
    "Authorization": `Bearer ${sessionToken}`,
  };
}

const defaultReward: Omit<GamePassReward, "id"> = {
  day: 1,
  tier: "free",
  item_id: 0,
  item_name: "",
  quantity: 1,
  coins: 0,
  zen: 0,
  exp: 0,
  rarity: "common",
  icon: "🎁",
};

// Extracted form component to prevent focus issues
interface RewardFormContentProps {
  editData: Omit<GamePassReward, "id">;
  setEditData: (data: Omit<GamePassReward, "id">) => void;
  selectedReward: GamePassReward | null;
  isSubmitting: boolean;
  onSave: () => void;
  onClose: () => void;
}

const RewardFormContent = memo(function RewardFormContent({
  editData,
  setEditData,
  selectedReward,
  isSubmitting,
  onSave,
  onClose,
}: RewardFormContentProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Day (1-30)</label>
          <Input
            type="number"
            min={1}
            max={30}
            value={editData.day}
            onChange={(e) => setEditData({ ...editData, day: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Tier</label>
          <Select value={editData.tier} onValueChange={(v: "free" | "elite") => setEditData({ ...editData, tier: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">
                <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> Free</span>
              </SelectItem>
              <SelectItem value="elite">
                <span className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /> Elite</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Item ID (0 = currency only)</label>
          <Input
            type="number"
            min={0}
            value={editData.item_id}
            onChange={(e) => setEditData({ ...editData, item_id: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Quantity</label>
          <Input
            type="number"
            min={1}
            value={editData.quantity}
            onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Item Name (display)</label>
        <Input
          value={editData.item_name}
          onChange={(e) => setEditData({ ...editData, item_name: e.target.value })}
          placeholder="e.g. Epic Chest, 100 Coins..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1">
            <Coins className="h-3 w-3" /> Coins
          </label>
          <Input
            type="number"
            min={0}
            value={editData.coins}
            onChange={(e) => setEditData({ ...editData, coins: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1">
            <Gem className="h-3 w-3" /> Zen
          </label>
          <Input
            type="number"
            min={0}
            value={editData.zen}
            onChange={(e) => setEditData({ ...editData, zen: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">EXP</label>
          <Input
            type="number"
            min={0}
            value={editData.exp}
            onChange={(e) => setEditData({ ...editData, exp: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Rarity</label>
          <Select value={editData.rarity} onValueChange={(v: GamePassReward["rarity"]) => setEditData({ ...editData, rarity: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rarityOptions.map(r => (
                <SelectItem key={r.value} value={r.value}>
                  <span className={r.color}>{r.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Icon</label>
          <Select value={editData.icon} onValueChange={(v) => setEditData({ ...editData, icon: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="grid grid-cols-6 gap-1 p-1">
                {iconOptions.map(icon => (
                  <SelectItem key={icon} value={icon} className="text-center cursor-pointer">
                    <span className="text-xl">{icon}</span>
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={onSave} disabled={isSubmitting} className="flex-1">
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : selectedReward ? "Update Reward" : "Add Reward"}
        </Button>
        <Button variant="outline" onClick={onClose}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
});

export function GamePassRewardsManager({ username }: GamePassRewardsManagerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [rewards, setRewards] = useState<GamePassReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<GamePassReward | null>(null);
  const [editData, setEditData] = useState<Omit<GamePassReward, "id">>(defaultReward);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterTier, setFilterTier] = useState<"all" | "free" | "elite">("all");

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://woiendgame.online/api/gamepass_admin.php?action=get_rewards");
      const data = await response.json();
      if (data.success && data.rewards) {
        setRewards(data.rewards);
      } else {
        setRewards([]);
      }
    } catch (error) {
      console.error("Failed to fetch rewards:", error);
      toast({ title: "Error", description: "Failed to load rewards", variant: "destructive" });
      setRewards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReward = async () => {
    if (!editData.item_name.trim()) {
      toast({ title: "Error", description: "Please enter item name", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = selectedReward 
        ? "https://woiendgame.online/api/gamepass_admin.php?action=update_reward"
        : "https://woiendgame.online/api/gamepass_admin.php?action=add_reward";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          ...editData,
          id: selectedReward?.id,
          updated_by: username || "GM",
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ title: "Success", description: selectedReward ? "Reward updated!" : "Reward added!" });
        fetchRewards();
        handleCloseModal();
      } else {
        toast({ title: "Error", description: data.error || "Failed to save reward", variant: "destructive" });
      }
    } catch (error) {
      console.error("Save reward error:", error);
      toast({ title: "Error", description: "Failed to save reward", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReward = async (id: number) => {
    try {
      const response = await fetch("https://woiendgame.online/api/gamepass_admin.php?action=delete_reward", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Deleted", description: "Reward removed." });
        fetchRewards();
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete reward", variant: "destructive" });
      }
    } catch (error) {
      console.error("Delete reward error:", error);
      toast({ title: "Error", description: "Failed to delete reward", variant: "destructive" });
    }
  };

  const handleEditReward = (reward: GamePassReward) => {
    setSelectedReward(reward);
    setEditData({
      day: reward.day,
      tier: reward.tier,
      item_id: reward.item_id,
      item_name: reward.item_name,
      quantity: reward.quantity,
      coins: reward.coins,
      zen: reward.zen,
      exp: reward.exp,
      rarity: reward.rarity,
      icon: reward.icon,
    });
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setSelectedReward(null);
    setEditData(defaultReward);
    setIsEditing(true);
  };

  const handleCloseModal = () => {
    setSelectedReward(null);
    setIsEditing(false);
    setEditData(defaultReward);
  };

  const filteredRewards = rewards
    .filter(r => filterTier === "all" || r.tier === filterTier)
    .sort((a, b) => a.day - b.day || (a.tier === "free" ? -1 : 1));

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="h-5 w-5" />
                Game Pass Rewards
              </CardTitle>
              <CardDescription>
                Configure daily rewards for Free and Elite pass tiers
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterTier} onValueChange={(v: "all" | "free" | "elite") => setFilterTier(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free Only</SelectItem>
                  <SelectItem value="elite">Elite Only</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Reward
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading rewards...</div>
          ) : filteredRewards.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No rewards configured</p>
              <Button onClick={handleAddNew} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Reward
              </Button>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredRewards.map((reward) => (
                <div 
                  key={reward.id} 
                  className="p-3 rounded-lg border bg-card/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{reward.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{reward.item_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Day {reward.day}</span>
                          <Badge variant={reward.tier === "elite" ? "default" : "secondary"} className="text-xs">
                            {reward.tier === "elite" ? <Crown className="h-3 w-3 mr-1" /> : <Gift className="h-3 w-3 mr-1" />}
                            {reward.tier}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditReward(reward)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteReward(reward.id!)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(reward.coins > 0 || reward.zen > 0 || reward.item_id > 0) && (
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {reward.item_id > 0 && <span>Item #{reward.item_id} x{reward.quantity}</span>}
                      {reward.coins > 0 && <span>🪙 {reward.coins}</span>}
                      {reward.zen > 0 && <span>💎 {reward.zen}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Item ID</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Coins/Zen</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell className="font-medium">{reward.day}</TableCell>
                    <TableCell>
                      <Badge variant={reward.tier === "elite" ? "default" : "secondary"}>
                        {reward.tier === "elite" ? <Crown className="h-3 w-3 mr-1" /> : <Gift className="h-3 w-3 mr-1" />}
                        {reward.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{reward.icon}</span>
                        <span>{reward.item_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{reward.item_id || "-"}</TableCell>
                    <TableCell>{reward.quantity}</TableCell>
                    <TableCell>
                      {reward.coins > 0 && <span className="mr-2">🪙{reward.coins}</span>}
                      {reward.zen > 0 && <span>💎{reward.zen}</span>}
                      {reward.coins === 0 && reward.zen === 0 && "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={rarityOptions.find(r => r.value === reward.rarity)?.color}>
                        {reward.rarity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditReward(reward)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteReward(reward.id!)}>
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

      {/* Edit/Add Modal - Desktop */}
      {!isMobile && (
        <Dialog open={isEditing} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedReward ? "Edit Reward" : "Add New Reward"}</DialogTitle>
              <DialogDescription>
                Configure the reward details for the Game Pass
              </DialogDescription>
            </DialogHeader>
            <RewardFormContent 
              editData={editData}
              setEditData={setEditData}
              selectedReward={selectedReward}
              isSubmitting={isSubmitting}
              onSave={handleSaveReward}
              onClose={handleCloseModal}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit/Add Modal - Mobile Drawer */}
      {isMobile && (
        <Drawer open={isEditing} onOpenChange={(open) => !open && handleCloseModal()}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{selectedReward ? "Edit Reward" : "Add New Reward"}</DrawerTitle>
              <DrawerDescription>
                Configure the reward details for the Game Pass
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-8">
              <RewardFormContent 
                editData={editData}
                setEditData={setEditData}
                selectedReward={selectedReward}
                isSubmitting={isSubmitting}
                onSave={handleSaveReward}
                onClose={handleCloseModal}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
