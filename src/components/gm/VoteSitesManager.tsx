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
import { voteSitesApi, VoteSite, VoteSiteFormData } from "@/lib/voteSitesApi";
import {
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  Coins,
  Crown,
  Clock,
  Save,
  X,
  AlertTriangle,
  Link2,
} from "lucide-react";

export const VoteSitesManager = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [sites, setSites] = useState<VoteSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newSite, setNewSite] = useState<VoteSiteFormData>({
    name: "",
    url: "",
    image_url: "",
    coins_reward: 50,
    vip_reward: 25,
    cooldown_hours: 12,
    is_active: true,
  });

  // Edit modal state
  const [editingSite, setEditingSite] = useState<VoteSite | null>(null);
  const [editData, setEditData] = useState<VoteSiteFormData>({
    name: "",
    url: "",
    image_url: "",
    coins_reward: 50,
    vip_reward: 25,
    cooldown_hours: 12,
    is_active: true,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setIsLoading(true);
    const data = await voteSitesApi.getAllSites();
    // Fallback to demo data if API fails
    if (data.length === 0) {
      setSites([
        { id: 1, name: "TopG", url: "https://topg.org", image_url: null, coins_reward: 50, vip_reward: 25, cooldown_hours: 12, is_active: true, sort_order: 1 },
        { id: 2, name: "Top 100 Arena", url: "https://top100arena.com", image_url: null, coins_reward: 50, vip_reward: 25, cooldown_hours: 12, is_active: true, sort_order: 2 },
        { id: 3, name: "Arena Top 100", url: "https://arenatop100.com", image_url: null, coins_reward: 50, vip_reward: 25, cooldown_hours: 12, is_active: true, sort_order: 3 },
      ]);
    } else {
      setSites(data);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSite.name.trim() || !newSite.url.trim()) {
      toast({
        title: "Error",
        description: "Please fill in name and URL",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const success = await voteSitesApi.addSite(newSite);

    if (success) {
      toast({
        title: "Success",
        description: "Vote site added!",
      });
      setNewSite({
        name: "",
        url: "",
        image_url: "",
        coins_reward: 50,
        vip_reward: 25,
        cooldown_hours: 12,
        is_active: true,
      });
      fetchSites();
    } else {
      // Demo mode: add locally
      setSites((prev) => [
        ...prev,
        {
          ...newSite,
          id: Date.now(),
          image_url: newSite.image_url || null,
          sort_order: prev.length + 1,
        },
      ]);
      toast({
        title: "Success (Demo)",
        description: "Vote site added locally",
      });
      setNewSite({
        name: "",
        url: "",
        image_url: "",
        coins_reward: 50,
        vip_reward: 25,
        cooldown_hours: 12,
        is_active: true,
      });
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    const success = await voteSitesApi.deleteSite(id);

    if (success) {
      toast({
        title: "Deleted",
        description: "Vote site removed.",
      });
      fetchSites();
    } else {
      // Demo mode: remove locally
      setSites((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: "Deleted (Demo)",
        description: "Vote site removed locally",
      });
    }
  };

  const handleEdit = (site: VoteSite) => {
    setEditingSite(site);
    setEditData({
      name: site.name,
      url: site.url,
      image_url: site.image_url || "",
      coins_reward: site.coins_reward,
      vip_reward: site.vip_reward,
      cooldown_hours: site.cooldown_hours,
      is_active: site.is_active,
    });
  };

  const handleCloseEdit = () => {
    setEditingSite(null);
  };

  const handleUpdate = async () => {
    if (!editingSite) return;

    if (!editData.name.trim() || !editData.url.trim()) {
      toast({
        title: "Error",
        description: "Please fill in name and URL",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    const success = await voteSitesApi.updateSite(editingSite.id, editData);

    if (success) {
      toast({
        title: "Success",
        description: "Vote site updated!",
      });
      fetchSites();
      handleCloseEdit();
    } else {
      // Demo mode: update locally
      setSites((prev) =>
        prev.map((s) =>
          s.id === editingSite.id
            ? { ...s, ...editData, image_url: editData.image_url || null }
            : s
        )
      );
      toast({
        title: "Success (Demo)",
        description: "Vote site updated locally",
      });
      handleCloseEdit();
    }

    setIsUpdating(false);
  };

  const handleToggleActive = async (id: number, is_active: boolean) => {
    const success = await voteSitesApi.toggleSite(id, is_active);

    if (!success) {
      // Demo mode: toggle locally
      setSites((prev) => prev.map((s) => (s.id === id ? { ...s, is_active } : s)));
    } else {
      fetchSites();
    }
  };

  const EditModalContent = () => {
    if (!editingSite) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Site Name</label>
          <Input
            placeholder="e.g., TopG"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Vote URL</label>
          <Input
            placeholder="https://example.com/vote"
            value={editData.url}
            onChange={(e) => setEditData({ ...editData, url: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Image URL (optional)</label>
          <Input
            placeholder="https://example.com/logo.png"
            value={editData.image_url}
            onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Coins</label>
            <Input
              type="number"
              value={editData.coins_reward}
              onChange={(e) =>
                setEditData({ ...editData, coins_reward: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">VIP Points</label>
            <Input
              type="number"
              value={editData.vip_reward}
              onChange={(e) =>
                setEditData({ ...editData, vip_reward: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Cooldown (h)</label>
            <Input
              type="number"
              value={editData.cooldown_hours}
              onChange={(e) =>
                setEditData({ ...editData, cooldown_hours: parseInt(e.target.value) || 12 })
              }
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
      {/* Add New Vote Site Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Add Vote Site
          </CardTitle>
          <CardDescription>Add a new voting site for users</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Site Name</label>
                <Input
                  placeholder="e.g., TopG"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Vote URL</label>
                <Input
                  placeholder="https://example.com/vote"
                  value={newSite.url}
                  onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Image URL (optional)</label>
              <Input
                placeholder="https://example.com/logo.png"
                value={newSite.image_url}
                onChange={(e) => setNewSite({ ...newSite, image_url: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-yellow-500" /> Coins
                </label>
                <Input
                  type="number"
                  value={newSite.coins_reward}
                  onChange={(e) =>
                    setNewSite({ ...newSite, coins_reward: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-purple-400" /> VIP Points
                </label>
                <Input
                  type="number"
                  value={newSite.vip_reward}
                  onChange={(e) =>
                    setNewSite({ ...newSite, vip_reward: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Cooldown (hours)
                </label>
                <Input
                  type="number"
                  value={newSite.cooldown_hours}
                  onChange={(e) =>
                    setNewSite({ ...newSite, cooldown_hours: parseInt(e.target.value) || 12 })
                  }
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? "Adding..." : "Add Vote Site"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Vote Sites List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5" />
            Configured Vote Sites
          </CardTitle>
          <CardDescription>{sites.length} vote site(s) configured</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading vote sites...</div>
          ) : sites.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No vote sites configured</p>
            </div>
          ) : isMobile ? (
            /* Mobile: Card-based layout */
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className={`p-3 rounded-lg border bg-card/50 space-y-2 ${
                    !site.is_active ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{site.name}</p>
                        <Badge variant={site.is_active ? "default" : "secondary"}>
                          {site.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Coins className="h-3 w-3" /> {site.coins_reward}
                        </span>
                        <span className="flex items-center gap-1 text-purple-400">
                          <Crown className="h-3 w-3" /> {site.vip_reward}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> {site.cooldown_hours}h
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(site)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(site.id)}
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
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Rewards</TableHead>
                  <TableHead>Cooldown</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id} className={!site.is_active ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        {site.url.replace(/^https?:\/\//, "").slice(0, 30)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500 text-sm">{site.coins_reward}💰</span>
                        <span className="text-purple-400 text-sm">{site.vip_reward}⭐</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.cooldown_hours}h
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={site.is_active}
                        onCheckedChange={(checked) => handleToggleActive(site.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(site)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(site.id)}
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

      {/* Edit Modal - Desktop */}
      {!isMobile && (
        <Dialog open={!!editingSite} onOpenChange={(open) => !open && handleCloseEdit()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Vote Site</DialogTitle>
              <DialogDescription>Update the vote site configuration</DialogDescription>
            </DialogHeader>
            <EditModalContent />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Modal - Mobile Drawer */}
      {isMobile && (
        <Drawer open={!!editingSite} onOpenChange={(open) => !open && handleCloseEdit()}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Edit Vote Site</DrawerTitle>
              <DrawerDescription>Update the vote site configuration</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-8">
              <EditModalContent />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
};
