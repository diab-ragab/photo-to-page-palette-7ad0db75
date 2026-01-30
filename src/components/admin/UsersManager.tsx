import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Users, 
  Search, 
  Eye, 
  Ban, 
  Shield, 
  Coins,
  Crown,
  Save,
  X,
  RefreshCw,
  UserCog,
  Mail,
  Calendar,
  Gem
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  is_banned: boolean;
  role?: string;
  coins?: number;
  vip_points?: number;
  zen?: number;
  total_votes?: number;
}

export function UsersManager() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState({
    coins: 0,
    vip_points: 0,
    zen: 0,
    role: "user",
    is_banned: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("woi_session_token") || "";
      const response = await fetch("https://woiendgame.online/api/admin_users.php?action=list", {
        credentials: "include",
        redirect: "error",
        headers: {
          "Accept": "application/json",
          "X-Session-Token": token,
          "Authorization": `Bearer ${token}`,
        },
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const rid = data?.rid ? ` (RID: ${data.rid})` : "";
        const msg = data?.message || `Server error (${response.status})`;
        toast({ title: "Error", description: `${msg}${rid}`, variant: "destructive" });
        setUsers([]);
        return;
      }
      
      if (data?.success && Array.isArray(data.users)) {
        // Map API response to expected format
        const mappedUsers = data.users.map((u: any) => ({
          id: Number(u.id),
          name: String(u.name ?? u.username ?? ""),
          email: String(u.email ?? ""),
          created_at: String(u.created_at ?? ""),
          is_banned: Boolean(u.is_banned),
          role: u.is_admin ? "admin" : "user",
          coins: Number(u.coins ?? 0),
          vip_points: Number(u.vip_points ?? 0),
          zen: Number(u.zen ?? 0),
        }));
        setUsers(mappedUsers);
      } else {
        toast({ title: "Error", description: data.message || "Failed to load users", variant: "destructive" });
        setUsers([]);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast({ title: "Error", description: "Failed to connect to server", variant: "destructive" });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setEditData({
      coins: user.coins || 0,
      vip_points: user.vip_points || 0,
      zen: user.zen || 0,
      role: user.role || "user",
      is_banned: user.is_banned,
    });
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("woi_session_token") || "";
      
      // Update currency
      const currencyResponse = await fetch("https://woiendgame.online/api/admin_users.php?action=update_currency", {
        method: "POST",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
          "X-Session-Token": token,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          coins: editData.coins,
          vip_points: editData.vip_points,
          zen: editData.zen,
        }),
      });

      const currencyData = await currencyResponse.json();

      // Update role if changed
      const currentIsAdmin = selectedUser.role === "admin";
      const newIsAdmin = editData.role === "admin";
      
      if (currentIsAdmin !== newIsAdmin) {
        await fetch("https://woiendgame.online/api/admin_users.php?action=set_role", {
          method: "POST",
          credentials: "include",
          headers: { 
            "Content-Type": "application/json",
            "X-Session-Token": token,
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: selectedUser.id,
            role: "admin",
            grant: newIsAdmin,
          }),
        });
      }

      // Update ban status if changed
      if (selectedUser.is_banned !== editData.is_banned) {
        await fetch("https://woiendgame.online/api/admin_users.php?action=toggle_ban", {
          method: "POST",
          credentials: "include",
          headers: { 
            "Content-Type": "application/json",
            "X-Session-Token": token,
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: selectedUser.id,
            ban: editData.is_banned,
          }),
        });
      }

      if (currencyData.success) {
        toast({ title: "Success", description: "User updated successfully!" });
        fetchUsers();
        handleCloseModal();
      } else {
        toast({ title: "Error", description: currencyData.message || "Failed to update user", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to update user:", err);
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleBan = async (userId: number, isBanned: boolean) => {
    try {
      const token = localStorage.getItem("woi_session_token") || "";
      const response = await fetch("https://woiendgame.online/api/admin_users.php?action=toggle_ban", {
        method: "POST",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
          "X-Session-Token": token,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, ban: isBanned }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ 
          title: isBanned ? "User Banned" : "User Unbanned", 
          description: `User has been ${isBanned ? "banned" : "unbanned"}.` 
        });
        fetchUsers();
      } else {
        toast({ title: "Error", description: data.message || "Failed to update ban status", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to toggle ban:", err);
      toast({ title: "Error", description: "Failed to update ban status", variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const UserEditContent = () => {
    if (!selectedUser) return null;

    return (
      <div className="space-y-4">
        {/* User Info */}
        <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">{selectedUser.name}</span>
            {selectedUser.role === "admin" && (
              <Badge variant="destructive" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
            {selectedUser.is_banned && (
              <Badge variant="outline" className="text-destructive border-destructive">
                Banned
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            {selectedUser.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Joined: {format(new Date(selectedUser.created_at), "MMM d, yyyy")}
          </div>
        </div>

        {/* Currency Controls */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              <Coins className="h-3 w-3 text-yellow-500" /> Coins
            </label>
            <Input
              type="number"
              value={editData.coins}
              onChange={(e) => setEditData({ ...editData, coins: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              <Crown className="h-3 w-3 text-purple-500" /> VIP Points
            </label>
            <Input
              type="number"
              value={editData.vip_points}
              onChange={(e) => setEditData({ ...editData, vip_points: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              <Gem className="h-3 w-3 text-cyan-500" /> Zen
            </label>
            <Input
              type="number"
              value={editData.zen}
              onChange={(e) => setEditData({ ...editData, zen: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Role</label>
          <Select value={editData.role} onValueChange={(v) => setEditData({ ...editData, role: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ban Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <Ban className={`h-4 w-4 ${editData.is_banned ? "text-destructive" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">Account Banned</span>
          </div>
          <Switch
            checked={editData.is_banned}
            onCheckedChange={(checked) => setEditData({ ...editData, is_banned: checked })}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleUpdateUser} disabled={isUpdating} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={handleCloseModal}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                View and manage all registered users
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchUsers} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>{filteredUsers.length} user(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className={`p-3 rounded-lg border bg-card/50 space-y-2 ${user.is_banned ? "opacity-60" : ""}`}
                  onClick={() => handleViewUser(user)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{user.name}</p>
                        {user.role === "admin" && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {user.is_banned && (
                          <Badge variant="outline" className="text-xs text-destructive">
                            Banned
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-yellow-500">{user.coins || 0} coins</span>
                        <span className="text-purple-400">{user.vip_points || 0} VIP</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewUser(user);
                      }}
                    >
                      <UserCog className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>VIP Points</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={user.is_banned ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-yellow-500">{(user.coins || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-purple-400">{(user.vip_points || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge variant="destructive" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{user.role || "User"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_banned ? (
                        <Badge variant="outline" className="text-destructive border-destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-500 border-green-500">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${user.is_banned ? "text-green-500" : "text-destructive"}`}
                          onClick={() => handleToggleBan(user.id, !user.is_banned)}
                        >
                          <Ban className="h-4 w-4" />
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

      {/* Edit User Modal */}
      {isMobile ? (
        <Drawer open={!!selectedUser} onOpenChange={(open) => !open && handleCloseModal()}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Edit User
              </DrawerTitle>
              <DrawerDescription>Manage user account settings</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <UserEditContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Edit User
              </DialogTitle>
              <DialogDescription>Manage user account settings</DialogDescription>
            </DialogHeader>
            <UserEditContent />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
