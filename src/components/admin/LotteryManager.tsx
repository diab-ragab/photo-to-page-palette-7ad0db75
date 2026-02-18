import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  getAdminLotteryStatus,
  getAdminEntries,
  getAdminWinnersHistory,
  triggerDraw,
  rerollDraw,
  banLotteryUser,
  unbanLotteryUser,
  updateLotterySettings,
  getAdminBans,
} from "@/lib/lotteryApi";
import {
  Ticket,
  Trophy,
  Users,
  ShieldAlert,
  Settings,
  Play,
  RotateCcw,
  Ban,
  CheckCircle2,
  Gem,
  AlertTriangle,
  Eye,
  RefreshCw,
} from "lucide-react";

function formatZen(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

export function LotteryManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [winnersHistory, setWinnersHistory] = useState<any[]>([]);
  const [bans, setBans] = useState<any[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banUserId, setBanUserId] = useState("");
  const [banReason, setBanReason] = useState("");

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    enabled: "1",
    min_entry_zen: "50000",
    max_entries_per_day: "10",
    free_entries_per_day: "1",
    winners_per_draw: "3",
    reward_multiplier: "3",
    draw_hour: "20",
    draw_minute: "0",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, entriesRes, winnersRes, bansRes] = await Promise.all([
        getAdminLotteryStatus(),
        getAdminEntries(),
        getAdminWinnersHistory(),
        getAdminBans(),
      ]);

      if (statusRes.success) {
        setAdminData(statusRes);
        if (statusRes.settings) {
          setSettingsForm((prev) => ({ ...prev, ...statusRes.settings }));
        }
      }
      if (entriesRes.success) setEntries(entriesRes.entries || []);
      if (winnersRes.success) setWinnersHistory(winnersRes.winners || []);
      if (bansRes.success) setBans(bansRes.bans || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDraw = async () => {
    if (!confirm("Are you sure you want to trigger the draw now?")) return;
    setDrawing(true);
    try {
      const res = await triggerDraw();
      if (res.success) {
        toast({ title: "🎉 Draw Complete!", description: res.message });
        fetchAll();
      } else {
        toast({ title: "Draw Failed", description: res.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
    setDrawing(false);
  };

  const handleReroll = async () => {
    if (!adminData?.draw?.id) return;
    if (!confirm("This will clear today's winners and reset the draw. Continue?")) return;
    try {
      const res = await rerollDraw(adminData.draw.id);
      if (res.success) {
        toast({ title: "Reroll Complete", description: res.message });
        fetchAll();
      } else {
        toast({ title: "Reroll Failed", description: res.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await updateLotterySettings(settingsForm);
      if (res.success) {
        toast({ title: "Settings Saved", description: res.message });
        fetchAll();
      } else {
        toast({ title: "Save Failed", description: res.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleBan = async () => {
    const uid = parseInt(banUserId);
    if (!uid || !banReason.trim()) {
      toast({ title: "Error", description: "User ID and reason required.", variant: "destructive" });
      return;
    }
    try {
      const res = await banLotteryUser(uid, banReason.trim());
      if (res.success) {
        toast({ title: "User Banned", description: res.message });
        setBanUserId("");
        setBanReason("");
        fetchAll();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleUnban = async (userId: number) => {
    try {
      const res = await unbanLotteryUser(userId);
      if (res.success) {
        toast({ title: "User Unbanned", description: res.message });
        fetchAll();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const draw = adminData?.draw;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Today's Pool", value: formatZen(draw?.total_pool || 0), icon: Gem, color: "text-primary" },
          { label: "Today's Entries", value: adminData?.total_entries || 0, icon: Ticket, color: "text-blue-400" },
          { label: "Flagged", value: adminData?.flagged_entries || 0, icon: AlertTriangle, color: "text-destructive" },
          { label: "Total Draws", value: adminData?.total_draws || 0, icon: Trophy, color: "text-yellow-400" },
          { label: "Active Bans", value: adminData?.active_bans || 0, icon: Ban, color: "text-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card">
            <CardContent className="p-3 text-center">
              <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Draw Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            Draw Controls
          </CardTitle>
          <CardDescription>
            Status: <Badge variant="outline" className="ml-1">{draw?.status || "unknown"}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleDraw} disabled={drawing || draw?.status === "completed"} className="gap-2">
            <Play className="h-4 w-4" />
            {drawing ? "Drawing..." : "Trigger Draw Now"}
          </Button>
          <Button onClick={handleReroll} variant="outline" className="gap-2" disabled={draw?.status !== "completed"}>
            <RotateCcw className="h-4 w-4" />
            Reroll Winners
          </Button>
          <Button onClick={fetchAll} variant="ghost" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="entries" className="gap-1 text-xs"><Eye className="h-3 w-3" /> Entries</TabsTrigger>
          <TabsTrigger value="winners" className="gap-1 text-xs"><Trophy className="h-3 w-3" /> Winners</TabsTrigger>
          <TabsTrigger value="bans" className="gap-1 text-xs"><Ban className="h-3 w-3" /> Bans</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 text-xs"><Settings className="h-3 w-3" /> Settings</TabsTrigger>
        </TabsList>

        {/* Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Today's Entries ({entries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Zen</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Flag</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No entries yet</TableCell></TableRow>
                    ) : entries.map((entry: any) => (
                      <TableRow key={entry.id} className={entry.is_flagged === 1 ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs">#{entry.id}</TableCell>
                        <TableCell className="text-xs font-medium">{entry.username || `UID:${entry.user_id}`}</TableCell>
                        <TableCell className="text-xs">{entry.zen_amount > 0 ? formatZen(entry.zen_amount) : "Free"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{entry.entry_type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entry.ip_address}</TableCell>
                        <TableCell>
                          {entry.is_flagged === 1 ? (
                            <Badge variant="destructive" className="text-[10px]">{entry.flag_reason || "Flagged"}</Badge>
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Winners Tab */}
        <TabsContent value="winners">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Winners History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Entered</TableHead>
                      <TableHead>Won</TableHead>
                      <TableHead>Delivered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {winnersHistory.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No winners yet</TableCell></TableRow>
                    ) : winnersHistory.map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-xs">{w.draw_date}</TableCell>
                        <TableCell className="text-xs">#{w.rank_position}</TableCell>
                        <TableCell className="text-xs font-medium">{w.username}</TableCell>
                        <TableCell className="text-xs">{formatZen(w.zen_entered)}</TableCell>
                        <TableCell className="text-xs font-bold text-primary">{formatZen(w.zen_won)}</TableCell>
                        <TableCell>
                          {w.delivered ? (
                            <Badge className="bg-green-500/10 text-green-500 text-[10px]">Yes</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">No</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bans Tab */}
        <TabsContent value="bans">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ban Player</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Input placeholder="User ID" value={banUserId} onChange={(e) => setBanUserId(e.target.value)} className="w-32" />
                <Input placeholder="Reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="flex-1" />
                <Button onClick={handleBan} variant="destructive" className="gap-2"><Ban className="h-4 w-4" /> Ban</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Active Bans ({bans.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64">
                  {bans.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No active bans</p>
                  ) : bans.map((ban: any) => (
                    <div key={ban.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg mb-2">
                      <div>
                        <p className="text-sm font-medium">{ban.username || `UID:${ban.user_id}`}</p>
                        <p className="text-xs text-muted-foreground">{ban.reason}</p>
                        <p className="text-xs text-muted-foreground">{ban.created_at}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleUnban(ban.user_id)}>Unban</Button>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Lottery Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Lottery Enabled</Label>
                <Switch
                  checked={settingsForm.enabled === "1"}
                  onCheckedChange={(v) => setSettingsForm((p) => ({ ...p, enabled: v ? "1" : "0" }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Min Entry Zen</Label>
                  <Input value={settingsForm.min_entry_zen} onChange={(e) => setSettingsForm((p) => ({ ...p, min_entry_zen: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Max Entries/Day</Label>
                  <Input value={settingsForm.max_entries_per_day} onChange={(e) => setSettingsForm((p) => ({ ...p, max_entries_per_day: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Free Entries/Day</Label>
                  <Input value={settingsForm.free_entries_per_day} onChange={(e) => setSettingsForm((p) => ({ ...p, free_entries_per_day: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Winners Per Draw</Label>
                  <Input value={settingsForm.winners_per_draw} onChange={(e) => setSettingsForm((p) => ({ ...p, winners_per_draw: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Reward Multiplier (x)</Label>
                  <Input value={settingsForm.reward_multiplier} onChange={(e) => setSettingsForm((p) => ({ ...p, reward_multiplier: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Draw Hour (0-23)</Label>
                  <Input value={settingsForm.draw_hour} onChange={(e) => setSettingsForm((p) => ({ ...p, draw_hour: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="w-full gap-2">
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
