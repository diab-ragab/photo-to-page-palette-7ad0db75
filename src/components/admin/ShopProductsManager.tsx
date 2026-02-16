import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { API_BASE, getAuthHeaders } from "@/lib/apiFetch";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  X,
  Package,
  Zap,
  Coins,
  Sword,
  Gift,
  Image,
} from "lucide-react";

interface AdminProduct {
  id: number;
  sku: string;
  name: string;
  description: string;
  type: string;
  price_cents: number;
  currency: string;
  payload_json: string;
  image_url: string;
  is_active: number;
  sort_order: number;
}

const emptyProduct: Omit<AdminProduct, "id"> & { id: number } = {
  id: 0,
  sku: "",
  name: "",
  description: "",
  type: "item",
  price_cents: 0,
  currency: "EUR",
  payload_json: "{}",
  image_url: "",
  is_active: 1,
  sort_order: 0,
};

const typeIcons: Record<string, React.ReactNode> = {
  zen: <Zap className="w-3.5 h-3.5" />,
  coins: <Coins className="w-3.5 h-3.5" />,
  exp: <Zap className="w-3.5 h-3.5" />,
  item: <Sword className="w-3.5 h-3.5" />,
  bundle: <Gift className="w-3.5 h-3.5" />,
};

const TYPES = ["zen", "coins", "exp", "item", "bundle"] as const;

/* ── Standalone form to prevent focus loss ── */
interface ProductFormProps {
  product: AdminProduct;
  onChange: (p: AdminProduct) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}

const ProductForm = ({ product, onChange, onSave, onCancel, saving, isNew }: ProductFormProps) => {
  const set = (key: keyof AdminProduct, value: string | number) =>
    onChange({ ...product, [key]: value });

  return (
    <Card className="border-primary/50 shadow-lg shadow-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {isNew ? <Plus className="h-5 w-5 text-primary" /> : <Pencil className="h-5 w-5 text-primary" />}
          {isNew ? "New Product" : `Edit: ${product.name}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={product.name} onChange={(e) => set("name", e.target.value)} placeholder="Flash Zen Bundle" />
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={product.sku} onChange={(e) => set("sku", e.target.value)} placeholder="ZEN-500K" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={product.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description…" rows={2} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={product.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Price (€)</Label>
            <Input type="number" min={0} step="0.01" value={(product.price_cents / 100).toFixed(2)} onChange={(e) => set("price_cents", Math.round(parseFloat(e.target.value || "0") * 100))} />
          </div>
          <div className="space-y-2">
            <Label>Item ID</Label>
            <Input type="number" min={0} value={(() => { try { const p = JSON.parse(product.payload_json); return p.item_id || 0; } catch { return 0; } })()} onChange={(e) => { try { const p = JSON.parse(product.payload_json || "{}"); p.item_id = parseInt(e.target.value) || 0; set("payload_json", JSON.stringify(p)); } catch { set("payload_json", JSON.stringify({ item_id: parseInt(e.target.value) || 0, quality: 0 })); } }} placeholder="e.g. 6159" />
          </div>
          <div className="space-y-2">
            <Label>Quality</Label>
            <Input type="number" min={0} value={(() => { try { const p = JSON.parse(product.payload_json); return p.quality || 0; } catch { return 0; } })()} onChange={(e) => { try { const p = JSON.parse(product.payload_json || "{}"); p.quality = parseInt(e.target.value) || 0; set("payload_json", JSON.stringify(p)); } catch { set("payload_json", JSON.stringify({ item_id: 0, quality: parseInt(e.target.value) || 0 })); } }} placeholder="e.g. 3" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Image className="h-4 w-4 text-muted-foreground" /> Image / Video URL</Label>
            <Input value={product.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://… (.jpg, .png, .mp4, .webm)" />
            <p className="text-xs text-muted-foreground">Supports images and video URLs. Users can click to preview in the shop.</p>
          </div>
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input type="number" value={product.sort_order} onChange={(e) => set("sort_order", parseInt(e.target.value) || 0)} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={product.is_active === 1}
            onCheckedChange={(v) => set("is_active", v ? 1 : 0)}
          />
          <Label>Active (visible in shop)</Label>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || !product.name.trim()}>
            <Save className={`h-4 w-4 mr-1 ${saving ? "animate-pulse" : ""}`} />
            {saving ? "Saving…" : isNew ? "Create" : "Update"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/* ── Main Manager ── */
export const ShopProductsManager = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin_shop_products.php?rid=${Date.now()}`, {
        credentials: "include",
        headers: { Accept: "application/json", ...getAuthHeaders() },
      });
      const data = await res.json();
      if (data.success) setProducts(data.products);
      else toast.error(data.error || "Failed to load products");
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = editing.id === 0;
      const body = { ...editing, action: isNew ? "create" : "update" };
      const res = await fetch(`${API_BASE}/admin_shop_products.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setEditing(null);
        fetchProducts();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin_shop_products.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Product deleted");
        fetchProducts();
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold">Shop Products</h3>
          <p className="text-sm text-muted-foreground">Manage flash sale products visible in /shop</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setEditing({ ...emptyProduct })} disabled={!!editing}>
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </div>
      </div>

      {/* Edit / Create form */}
      {editing && (
        <ProductForm
          product={editing}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
          isNew={editing.id === 0}
        />
      )}

      {/* Products list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-display">No products yet</p>
            <p className="text-sm mt-1">Click "Add Product" to create your first flash sale item.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <Card key={p.id} className={`transition-colors ${p.is_active ? "" : "opacity-60"}`}>
              <CardContent className="py-3 px-4 flex items-center gap-4">
                {/* Thumb */}
                <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-sm truncate">{p.name}</span>
                    <Badge variant="secondary" className="text-[10px] gap-1 uppercase">
                      {typeIcons[p.type]}{p.type}
                    </Badge>
                    {!p.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="font-semibold">€{(p.price_cents / 100).toFixed(2)}</span>
                    {p.sku && <span>SKU: {p.sku}</span>}
                    <span>#{p.id}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditing({ ...p })}
                    disabled={!!editing}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(p.id, p.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
