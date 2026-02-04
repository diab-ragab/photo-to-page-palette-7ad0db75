import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Calendar, 
  Plus, 
  Pencil, 
  Trash2,
  Save,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchEventStats,
  type GameEvent,
  type EventType,
  type EventStats,
  EVENT_TYPE_CONFIG,
  getEventStatus
} from '@/lib/eventsApi';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'double_xp', label: 'Double XP' },
  { value: 'double_drops', label: 'Double Drops' },
  { value: 'bonus_vote', label: 'Bonus Votes' },
  { value: 'sale', label: 'Sale' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'update', label: 'Update' },
  { value: 'pvp', label: 'PvP Event' },
  { value: 'boss', label: 'Boss Event' },
  { value: 'custom', label: 'Custom' },
];

const COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', 
  '#ef4444', '#ec4899', '#06b6d4', '#64748b'
];

interface EventFormData {
  title: string;
  description: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  all_day: number;
  color: string;
  banner_url: string;
  is_active: number;
  is_featured: number;
}

const defaultFormData: EventFormData = {
  title: '',
  description: '',
  event_type: 'custom',
  start_date: '',
  end_date: '',
  all_day: 0,
  color: '#3b82f6',
  banner_url: '',
  is_active: 1,
  is_featured: 0
};

export function EventsManager() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [evts, sts] = await Promise.all([
        fetchAdminEvents(),
        fetchEventStats()
      ]);
      setEvents(evts);
      setStats(sts);
    } catch (err) {
      console.error('Failed to load events:', err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    // Convert from MySQL format to datetime-local format
    return dateStr.replace(' ', 'T').slice(0, 16);
  };

  const formatDateForApi = (dateStr: string) => {
    if (!dateStr) return '';
    // Convert from datetime-local to MySQL format
    return dateStr.replace('T', ' ') + ':00';
  };

  const handleAddNew = () => {
    setEditingEvent(null);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setFormData({
      ...defaultFormData,
      start_date: now.toISOString().slice(0, 16),
      end_date: tomorrow.toISOString().slice(0, 16)
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (event: GameEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      start_date: formatDateForInput(event.start_date),
      end_date: formatDateForInput(event.end_date),
      all_day: event.all_day,
      color: event.color,
      banner_url: event.banner_url || '',
      is_active: event.is_active || 1,
      is_featured: event.is_featured
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Start and end dates are required');
      return;
    }

    try {
      setSaving(true);
      
      const eventData = {
        ...formData,
        start_date: formatDateForApi(formData.start_date),
        end_date: formatDateForApi(formData.end_date)
      };
      
      if (editingEvent) {
        await updateEvent({ ...eventData, id: editingEvent.id } as GameEvent);
        toast.success('Event updated');
      } else {
        await createEvent(eventData as Omit<GameEvent, 'id' | 'created_at' | 'updated_at'>);
        toast.success('Event created');
      }
      
      setIsDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    
    try {
      await deleteEvent(id);
      toast.success('Event deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const handleTypeChange = (type: EventType) => {
    const config = EVENT_TYPE_CONFIG[type];
    setFormData({ 
      ...formData, 
      event_type: type,
      color: config.defaultColor
    });
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Events</p>
                <p className="text-lg font-bold">{stats?.total_events || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Now</p>
                <p className="text-lg font-bold">{stats?.active_events || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-lg font-bold">{stats?.upcoming_events || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <CheckCircle className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Past Events</p>
                <p className="text-lg font-bold">{stats?.past_events || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Events ({events.length})
          </CardTitle>
          <Button size="sm" onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const status = getEventStatus(event);
                const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.custom;
                
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{event.title}</span>
                            {event.is_featured === 1 && (
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="text-xs">
                        <div>{new Date(event.start_date).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">
                          {event.all_day ? 'All day' : new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={status === 'active' ? 'default' : 'outline'}
                        className={`text-xs ${
                          status === 'active' ? 'bg-green-500' :
                          status === 'upcoming' ? 'text-blue-500 border-blue-500' :
                          'text-muted-foreground'
                        }`}
                      >
                        {status === 'active' ? 'Live' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
                      </Badge>
                      {event.is_active === 0 && (
                        <Badge variant="outline" className="ml-1 text-xs text-destructive border-destructive">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No events yet. Create your first event!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
            <DialogDescription>
              Configure the event details and schedule.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Weekend Double XP"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Event details..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(v) => handleTypeChange(v as EventType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        formData.color === color ? 'scale-110 border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Banner URL (optional)</Label>
              <Input
                value={formData.banner_url}
                onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>All Day Event</Label>
                  <p className="text-xs text-muted-foreground">Event spans the entire day(s)</p>
                </div>
                <Switch
                  checked={formData.all_day === 1}
                  onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked ? 1 : 0 })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Featured</Label>
                  <p className="text-xs text-muted-foreground">Highlight this event</p>
                </div>
                <Switch
                  checked={formData.is_featured === 1}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked ? 1 : 0 })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Show this event to users</p>
                </div>
                <Switch
                  checked={formData.is_active === 1}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked ? 1 : 0 })}
                />
              </div>
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
    </div>
  );
}
