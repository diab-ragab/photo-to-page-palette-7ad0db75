import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAdminChangelogs,
  createChangelog,
  updateChangelog,
  deleteChangelog,
  Changelog,
  ChangelogItem,
  ChangeType,
  VersionType,
  formatChangelogDate
} from "@/lib/changelogApi";
import {
  ScrollText,
  Plus,
  Minus,
  Trash2,
  Save,
  X,
  Edit,
  Wrench,
  RefreshCw,
  Shield,
  GripVertical
} from "lucide-react";

const VERSION_TYPES: { value: VersionType; label: string; color: string }[] = [
  { value: 'major', label: 'Major', color: 'bg-destructive' },
  { value: 'minor', label: 'Minor', color: 'bg-primary' },
  { value: 'patch', label: 'Patch', color: 'bg-muted' },
  { value: 'hotfix', label: 'Hotfix', color: 'bg-warning' },
];

const CHANGE_TYPES: { value: ChangeType; label: string; icon: typeof Plus }[] = [
  { value: 'add', label: 'Added', icon: Plus },
  { value: 'fix', label: 'Fixed', icon: Wrench },
  { value: 'change', label: 'Changed', icon: RefreshCw },
  { value: 'remove', label: 'Removed', icon: Minus },
  { value: 'security', label: 'Security', icon: Shield },
];

interface ChangelogFormProps {
  changelog?: Changelog | null;
  onSave: (data: Omit<Changelog, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

const ChangelogForm = ({ changelog, onSave, onCancel, saving }: ChangelogFormProps) => {
  const [version, setVersion] = useState(changelog?.version || '');
  const [versionType, setVersionType] = useState<VersionType>(changelog?.version_type || 'patch');
  const [releaseDate, setReleaseDate] = useState(
    changelog?.release_date 
      ? new Date(changelog.release_date).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  const [isPublished, setIsPublished] = useState(changelog?.is_published !== 0);
  const [changes, setChanges] = useState<ChangelogItem[]>(
    changelog?.changes || [{ change_type: 'add', description: '' }]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validChanges = changes.filter(c => c.description.trim());
    if (!version.trim() || validChanges.length === 0) return;
    
    await onSave({
      version: version.trim(),
      version_type: versionType,
      release_date: releaseDate,
      is_published: isPublished ? 1 : 0,
      changes: validChanges.map((c, i) => ({ ...c, sort_order: i })),
    });
  };

  const addChange = () => {
    setChanges([...changes, { change_type: 'add', description: '' }]);
  };

  const removeChange = (index: number) => {
    if (changes.length > 1) {
      setChanges(changes.filter((_, i) => i !== index));
    }
  };

  const updateChange = (index: number, field: keyof ChangelogItem, value: string) => {
    const updated = [...changes];
    updated[index] = { ...updated[index], [field]: value };
    setChanges(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v1.0.0"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="version_type">Type</Label>
          <Select value={versionType} onValueChange={(v) => setVersionType(v as VersionType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERSION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="release_date">Release Date</Label>
          <Input
            id="release_date"
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="is_published"
          checked={isPublished}
          onCheckedChange={setIsPublished}
        />
        <Label htmlFor="is_published">Published</Label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Changes</Label>
          <Button type="button" variant="outline" size="sm" onClick={addChange}>
            <Plus className="h-4 w-4 mr-1" /> Add Change
          </Button>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {changes.map((change, index) => (
            <div key={index} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              
              <Select
                value={change.change_type}
                onValueChange={(v) => updateChange(index, 'change_type', v)}
              >
                <SelectTrigger className="w-[110px] flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-3 w-3" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                value={change.description}
                onChange={(e) => updateChange(index, 'description', e.target.value)}
                placeholder="Describe the change..."
                className="flex-1"
              />
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeChange(index)}
                disabled={changes.length === 1}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button type="submit" disabled={saving || !version.trim()}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};

export const ChangelogManager = () => {
  const { toast } = useToast();
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const loadChangelogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminChangelogs();
      setChangelogs(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load changelog entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChangelogs();
  }, []);

  const handleCreate = async (data: Omit<Changelog, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setSaving(true);
      await createChangelog(data);
      toast({ title: "Success", description: "Changelog entry created" });
      setShowNewForm(false);
      loadChangelogs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create changelog entry",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: Omit<Changelog, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingId) return;
    
    try {
      setSaving(true);
      await updateChangelog({ ...data, id: editingId } as Changelog);
      toast({ title: "Success", description: "Changelog entry updated" });
      setEditingId(null);
      loadChangelogs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update changelog entry",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this changelog entry?')) return;
    
    try {
      await deleteChangelog(id);
      toast({ title: "Success", description: "Changelog entry deleted" });
      loadChangelogs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete changelog entry",
        variant: "destructive",
      });
    }
  };

  const getVersionTypeBadge = (type: VersionType) => {
    const config = VERSION_TYPES.find(t => t.value === type);
    return (
      <Badge variant="outline" className={`text-xs ${config?.color || ''}`}>
        {config?.label || type}
      </Badge>
    );
  };

  const getChangeIcon = (type: ChangeType) => {
    const config = CHANGE_TYPES.find(t => t.value === type);
    const Icon = config?.icon || Plus;
    return <Icon className="h-3 w-3" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Changelog Manager
              </CardTitle>
              <CardDescription>Manage version release notes and changes</CardDescription>
            </div>
            {!showNewForm && !editingId && (
              <Button onClick={() => setShowNewForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Version
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* New Form */}
          {showNewForm && (
            <Card className="mb-6 border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">New Changelog Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <ChangelogForm
                  onSave={handleCreate}
                  onCancel={() => setShowNewForm(false)}
                  saving={saving}
                />
              </CardContent>
            </Card>
          )}

          {/* List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : changelogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No changelog entries yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowNewForm(true)}>
                Create First Entry
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {changelogs.map((log) => (
                  <div key={log.id}>
                    {editingId === log.id ? (
                      <Card className="border-primary/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Edit {log.version}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChangelogForm
                            changelog={log}
                            onSave={handleUpdate}
                            onCancel={() => setEditingId(null)}
                            saving={saving}
                          />
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="font-display font-bold text-lg">{log.version}</span>
                          {getVersionTypeBadge(log.version_type)}
                          {log.is_published === 0 && (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                          <span className="text-sm text-muted-foreground ml-auto">
                            {formatChangelogDate(log.release_date)}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingId(log.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(log.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        <ul className="space-y-1">
                          {log.changes.map((change, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="text-primary">{getChangeIcon(change.change_type)}</span>
                              <span className="capitalize text-xs font-medium min-w-[60px]">
                                {change.change_type}:
                              </span>
                              <span>{change.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
