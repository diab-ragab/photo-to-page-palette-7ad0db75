import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { notificationsApi, Notification } from "@/lib/notificationsApi";
import { GamePassRewardsManager } from "@/components/gm/GamePassRewardsManager";
import { VoteSitesManager } from "@/components/gm/VoteSitesManager";
import { VoteStreakManager } from "@/components/gm/VoteStreakManager";
import { Shield, Plus, Trash2, Send, Megaphone, Wrench, Calendar, Sparkles, AlertTriangle, User, Eye, Pencil, X, Save, ArrowRightLeft, LayoutDashboard, Gift, Bell, Vote, Flame } from "lucide-react";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

const typeIcons = {
  news: Megaphone,
  update: Sparkles,
  maintenance: Wrench,
  event: Calendar,
};

export default function GMPanel() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [activeTab, setActiveTab] = useState("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGM, setIsGM] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // View/Edit modal state
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", message: "", type: "news" });
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "news",
  });

  // Check if user is GM from your MySQL database
  useEffect(() => {
    const checkGMStatus = async () => {
      if (!isLoggedIn || !user) {
        navigate("/");
        return;
      }

      try {
        // Call your PHP API to check GM status
        const response = await fetch(
          `https://woiendgame.online/api/check_gm.php?user=${encodeURIComponent(user.username)}`,
          { credentials: 'include' }
        );
        const data = await response.json();
        
        if (data.is_gm) {
          setIsGM(true);
        } else {
          toast({
            title: "Access Denied",
            description: "You don't have GM privileges.",
            variant: "destructive",
          });
          navigate("/dashboard");
        }
      } catch (error) {
        // Fail closed: deny access on any error
        toast({
          title: "Authorization Error",
          description: "Unable to verify GM status. Access denied.",
          variant: "destructive",
        });
        navigate("/dashboard");
      } finally {
        setCheckingAuth(false);
      }
    };

    checkGMStatus();
  }, [isLoggedIn, user, navigate, toast]);

  useEffect(() => {
    if (isGM) {
      fetchNotifications();
    }
  }, [isGM]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    const data = await notificationsApi.getAll();
    setNotifications(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    const success = await notificationsApi.create({
      ...newNotification,
      created_by: user?.username || "GM",
    });

    if (success) {
      toast({
        title: "Success",
        description: "Notification sent to all users!",
      });
      setNewNotification({ title: "", message: "", type: "news" });
      fetchNotifications();
    } else {
      toast({
        title: "Error",
        description: "Failed to send notification. Check your server connection.",
        variant: "destructive",
      });
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    const success = await notificationsApi.delete(id);
    
    if (success) {
      toast({
        title: "Deleted",
        description: "Notification removed.",
      });
      fetchNotifications();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete notification.",
        variant: "destructive",
      });
    }
  };

  const handleView = (notification: Notification) => {
    setSelectedNotification(notification);
    setEditData({
      title: notification.title,
      message: notification.message,
      type: notification.type,
    });
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setSelectedNotification(null);
    setIsEditing(false);
  };

  const handleUpdate = async () => {
    if (!selectedNotification) return;
    
    if (!editData.title.trim() || !editData.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    
    const success = await notificationsApi.update(selectedNotification.id, editData);

    if (success) {
      toast({
        title: "Success",
        description: "Notification updated!",
      });
      fetchNotifications();
      handleCloseModal();
    } else {
      toast({
        title: "Error",
        description: "Failed to update notification.",
        variant: "destructive",
      });
    }
    
    setIsUpdating(false);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking authorization...</div>
      </div>
    );
  }

  if (!isGM) {
    return null;
  }

  const NotificationModalContent = () => {
    if (!selectedNotification) return null;
    const Icon = typeIcons[selectedNotification.type as keyof typeof typeIcons] || Megaphone;
    
    return (
      <div className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select
                value={editData.type}
                onValueChange={(value) => setEditData({ ...editData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">
                    <span className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4" /> News
                    </span>
                  </SelectItem>
                  <SelectItem value="update">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Update
                    </span>
                  </SelectItem>
                  <SelectItem value="maintenance">
                    <span className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> Maintenance
                    </span>
                  </SelectItem>
                  <SelectItem value="event">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Event
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                value={editData.message}
                onChange={(e) => setEditData({ ...editData, message: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdate} disabled={isUpdating} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Icon className="h-3 w-3" />
                {selectedNotification.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                by {selectedNotification.created_by}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedNotification.created_at &&
                  format(new Date(selectedNotification.created_at), "MMM d, yyyy")}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm whitespace-pre-wrap">{selectedNotification.message}</p>
            </div>
            <Button onClick={() => setIsEditing(true)} className="w-full">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Notification
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="GM Panel | WOI Endgame"
        description="Game Master administration panel"
        noIndex
      />
      <Navbar />

      <main className="container px-4 pt-24 pb-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 rounded-xl bg-primary/20">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">GM Panel</h1>
              <p className="text-sm md:text-base text-muted-foreground">Manage notifications, game pass, vote sites & streaks</p>
            </div>
          </div>
          
          {/* Dashboard Switch */}
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="group gap-2 border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <LayoutDashboard className="h-4 w-4 text-primary" />
            <span>Dashboard</span>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notifs</span>
            </TabsTrigger>
            <TabsTrigger value="gamepass" className="gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Game Pass</span>
              <span className="sm:hidden">Pass</span>
            </TabsTrigger>
            <TabsTrigger value="votesites" className="gap-2">
              <Vote className="h-4 w-4" />
              <span className="hidden sm:inline">Vote Sites</span>
              <span className="sm:hidden">Votes</span>
            </TabsTrigger>
            <TabsTrigger value="streaks" className="gap-2">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Streaks</span>
              <span className="sm:hidden">🔥</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-6">
            {/* Create Notification Form */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5" />
                  New Notification
                </CardTitle>
                <CardDescription>
                  Send a notification to all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <Select
                      value={newNotification.type}
                      onValueChange={(value) =>
                        setNewNotification({ ...newNotification, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="news">
                          <span className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4" /> News
                          </span>
                        </SelectItem>
                        <SelectItem value="update">
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Update
                          </span>
                        </SelectItem>
                        <SelectItem value="maintenance">
                          <span className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" /> Maintenance
                          </span>
                        </SelectItem>
                        <SelectItem value="event">
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Event
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Title</label>
                    <Input
                      placeholder="Notification title..."
                      value={newNotification.title}
                      onChange={(e) =>
                        setNewNotification({ ...newNotification, title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea
                      placeholder="Write your message..."
                      rows={3}
                      value={newNotification.message}
                      onChange={(e) =>
                        setNewNotification({ ...newNotification, message: e.target.value })
                      }
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Sending..." : "Send Notification"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notifications List */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">All Notifications</CardTitle>
                <CardDescription>
                  {notifications.length} notification(s) sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No notifications yet</p>
                  </div>
                ) : isMobile ? (
                  /* Mobile: Card-based layout */
                  <div className="space-y-3">
                    {notifications.map((notification) => {
                      const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Megaphone;
                      return (
                        <div 
                          key={notification.id} 
                          className="p-3 rounded-lg border bg-card/50 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleView(notification)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Icon className="h-3 w-3" />
                                  {notification.type}
                                </Badge>
                              </div>
                              <p className="font-medium text-sm truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleView(notification);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {notification.created_by}
                            </span>
                            <span>
                              {notification.created_at &&
                                format(new Date(notification.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Desktop: Table layout */
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notification) => {
                        const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Megaphone;
                        return (
                          <TableRow 
                            key={notification.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleView(notification)}
                          >
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <Icon className="h-3 w-3" />
                                {notification.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {notification.title}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {notification.created_by}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {notification.created_at &&
                                format(new Date(notification.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleView(notification);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(notification.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gamepass">
            <GamePassRewardsManager username={user?.username} />
          </TabsContent>

          <TabsContent value="votesites">
            <VoteSitesManager />
          </TabsContent>

          <TabsContent value="streaks">
            <VoteStreakManager />
          </TabsContent>
        </Tabs>
      </main>

      {/* View/Edit Modal - Desktop */}
      {!isMobile && (
        <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Notification" : selectedNotification?.title}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Update the notification details" : "Full notification details"}
              </DialogDescription>
            </DialogHeader>
            <NotificationModalContent />
          </DialogContent>
        </Dialog>
      )}

      {/* View/Edit Modal - Mobile Drawer */}
      {isMobile && (
        <Drawer open={!!selectedNotification} onOpenChange={(open) => !open && handleCloseModal()}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{isEditing ? "Edit Notification" : selectedNotification?.title}</DrawerTitle>
              <DrawerDescription>
                {isEditing ? "Update the notification details" : "Full notification details"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-8">
              <NotificationModalContent />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <Footer />
    </div>
  );
}
