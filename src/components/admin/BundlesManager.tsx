import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { bundlesApi, Bundle, BundleFormData, BundleItem, BUNDLE_ICON_OPTIONS, getIconEmoji } from "@/lib/bundlesApi";
import { Plus, Trash2, Edit, Package, Clock, Flame, X, Save, Loader2 } from "lucide-react";

interface BundleFormProps {
  bundle: Bundle | null;
  onSave: () => void;
  onCancel: () => void;
}

const BundleForm = ({ bundle, onSave, onCancel }: BundleFormProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState(bundle?.name || "");
  const [description, setDescription] = useState(bundle?.description || "");
  const [originalPrice, setOriginalPrice] = useState(bundle?.original_price?.toString() || "");
  const [salePrice, setSalePrice] = useState(bundle?.sale_price?.toString() || "");
  const [endsAt, setEndsAt] = useState(() => {
    if (bundle?.ends_at) {
      return bundle.ends_at.slice(0, 16); // Format for datetime-local
    }
    // Default: 24 hours from now
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [isFeatured, setIsFeatured] = useState(bundle?.is_featured || false);
  const [stock, setStock] = useState(bundle?.stock?.toString() || "");
  const [isActive, setIsActive] = useState(bundle?.is_active ?? true);
  const [items, setItems] = useState<BundleItem[]>(
    bundle?.items?.length ? bundle.items : [{ item_name: "", quantity: 1, icon: "GIFT", item_id: 0, item_quantity: 1 }]
  );

  const addItem = () => {
    setItems([...items, { item_name: "", quantity: 1, icon: "GIFT", item_id: 0, item_quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BundleItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (!originalPrice || !salePrice) {
      toast({ title: "Prices required", variant: "destructive" });
      return;
    }
    if (items.filter((i) => i.item_name.trim()).length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const formData: BundleFormData = {
        name: name.trim(),
        description: description.trim(),
        original_price: parseFloat(originalPrice),
        sale_price: parseFloat(salePrice),
        ends_at: new Date(endsAt).toISOString().slice(0, 19).replace("T", " "),
        is_featured: isFeatured,
        stock: stock ? parseInt(stock, 10) : null,
        is_active: isActive,
        items: items.filter((i) => i.item_name.trim()),
      };

      if (bundle?.id) {
        await bundlesApi.update(bundle.id, formData);
        toast({ title: "Bundle updated!" });
      } else {
        await bundlesApi.create(formData);
        toast({ title: "Bundle created!" });
      }
      onSave();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const discount = originalPrice && salePrice
    ? Math.round((1 - parseFloat(salePrice) / parseFloat(originalPrice)) * 100)
    : 0;

  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {bundle ? "Edit Bundle" : "New Bundle"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Starter Pack" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Perfect for new players" />
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Original Price (€) *</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={originalPrice} 
              onChange={(e) => setOriginalPrice(e.target.value)} 
              placeholder="19.99"
            />
          </div>
          <div className="space-y-2">
            <Label>Sale Price (€) *</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={salePrice} 
              onChange={(e) => setSalePrice(e.target.value)} 
              placeholder="9.99"
            />
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <div className="h-10 flex items-center px-3 bg-muted rounded-md">
              <span className={discount >= 30 ? "text-green-500 font-bold" : "text-muted-foreground"}>
                {discount}% OFF
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Stock (optional)</Label>
            <Input 
              type="number" 
              value={stock} 
              onChange={(e) => setStock(e.target.value)} 
              placeholder="Unlimited"
            />
          </div>
        </div>

        {/* Timing & Flags */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Ends At *</Label>
            <Input 
              type="datetime-local" 
              value={endsAt} 
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            <Label className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Featured (HOT DEAL)
            </Label>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Bundle Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
          
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Select value={item.icon} onValueChange={(v) => updateItem(idx, "icon", v)}>
                <SelectTrigger className="w-20">
                  <SelectValue>
                    <span className="text-lg">{getIconEmoji(item.icon)}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BUNDLE_ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.code} value={opt.code}>
                      <span className="flex items-center gap-2">
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                className="flex-1 min-w-[150px]"
                placeholder="Display name (e.g., 500K Zen)"
                value={item.item_name}
                onChange={(e) => updateItem(idx, "item_name", e.target.value)}
              />
              
              <Input
                className="w-16"
                type="number"
                min="1"
                title="Display quantity"
                value={item.quantity}
                onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
              />

              <div className="flex items-center gap-1 border-l pl-2 ml-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground">Game Item ID</span>
                  <Input
                    className="w-20 h-8 text-xs"
                    type="number"
                    placeholder="0"
                    title="Item ID: 0=none, >0=item, -1=zen, -2=coins, -3=exp"
                    value={item.item_id || 0}
                    onChange={(e) => updateItem(idx, "item_id", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground">Qty</span>
                  <Input
                    className="w-16 h-8 text-xs"
                    type="number"
                    min="1"
                    placeholder="1"
                    title="Quantity to deliver"
                    value={item.item_quantity || 1}
                    onChange={(e) => updateItem(idx, "item_quantity", parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {bundle ? "Update" : "Create"} Bundle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const BundlesManager = () => {
  const { toast } = useToast();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchBundles = async () => {
    try {
      const data = await bundlesApi.getAll();
      setBundles(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleToggle = async (id: number, currentActive: boolean) => {
    try {
      await bundlesApi.toggle(id, !currentActive);
      setBundles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: !currentActive } : b))
      );
      toast({ title: currentActive ? "Bundle deactivated" : "Bundle activated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this bundle?")) return;
    try {
      await bundlesApi.delete(id);
      setBundles((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "Bundle deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingBundle(null);
    fetchBundles();
  };

  const isExpired = (endsAt: string) => new Date(endsAt) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Flash Sale Bundles</h2>
            <p className="text-sm text-muted-foreground">
              Manage limited-time offers with countdown timers
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => { setEditingBundle(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Bundle
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <BundleForm
          bundle={editingBundle}
          onSave={handleFormSave}
          onCancel={() => { setShowForm(false); setEditingBundle(null); }}
        />
      )}

      {/* Bundle List */}
      {bundles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No bundles created yet. Click "New Bundle" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bundles.map((bundle) => (
            <Card 
              key={bundle.id} 
              className={`${!bundle.is_active ? "opacity-60" : ""} ${isExpired(bundle.ends_at) ? "border-destructive/50" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{bundle.name}</h3>
                      {bundle.is_featured && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          <Flame className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {!bundle.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {isExpired(bundle.ends_at) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        €{Number(bundle.sale_price).toFixed(2)}
                        <span className="line-through ml-1 text-xs">€{Number(bundle.original_price).toFixed(2)}</span>
                        <span className="text-green-500 ml-1">-{bundle.discount_percent}%</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(bundle.ends_at).toLocaleString()}
                      </span>
                      {bundle.stock && (
                        <span>Stock: {bundle.stock}</span>
                      )}
                    </div>

                    {/* Items preview */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {bundle.items?.map((item, idx) => (
                        <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                          {getIconEmoji(item.icon)} {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.item_name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={bundle.is_active}
                      onCheckedChange={() => handleToggle(bundle.id, bundle.is_active)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => { setEditingBundle(bundle); setShowForm(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(bundle.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
