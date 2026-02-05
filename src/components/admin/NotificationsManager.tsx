import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { notificationsApi, Notification } from "@/lib/notificationsApi";
import { 
  Plus, 
  Trash2, 
  Send, 
  Megaphone, 
  Wrench, 
  Calendar, 
  Sparkles, 
  AlertTriangle, 
  Eye, 
  Pencil, 
  X, 
  Save 
} from "lucide-react";
import { format } from "date-fns";

const typeIcons = {
  news: Megaphone,
  update: Sparkles,
  maintenance: Wrench,
  event: Calendar,
};

interface NotificationsManagerProps {
  username?: string;
}

export function NotificationsManager({ username }: NotificationsManagerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    const data = await notificationsApi.getAll();
    // Ensure data is an array before setting state
    setNotifications(Array.isArray(data) ? data : []);
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
      created_by: username || "Admin",
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
        description: "Failed to send notification.",
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
    <div className="space-y-6">
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
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Megaphone;
                return (
                  <div 
                    key={notification.id} 
                    className="p-3 rounded-lg border bg-card/50 space-y-2"
                    onClick={() => handleView(notification)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {notification.type}
                          </Badge>
                          <span>by {notification.created_by}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
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
                    <TableRow key={notification.id}>
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
                      <TableCell className="text-muted-foreground">
                        {notification.created_at &&
                          format(new Date(notification.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleView(notification)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(notification.id)}
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

      {/* View/Edit Modal */}
      {isMobile ? (
        <Drawer open={!!selectedNotification} onOpenChange={(open) => !open && handleCloseModal()}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{selectedNotification?.title}</DrawerTitle>
              <DrawerDescription>View or edit notification</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <NotificationModalContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedNotification?.title}</DialogTitle>
              <DialogDescription>View or edit notification</DialogDescription>
            </DialogHeader>
            <NotificationModalContent />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
