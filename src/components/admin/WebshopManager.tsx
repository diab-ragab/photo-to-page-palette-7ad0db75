import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  ShoppingBag, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Package,
  Euro,
  Tag,
  Image as ImageIcon
} from "lucide-react";

interface ShopProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  item_id: number;
  quantity: number;
  is_active: boolean;
  is_featured: boolean;
}

const categories = [
  { value: "fashion", label: "Fashion" },
  { value: "pets", label: "Pet Eggs" },
  { value: "currency", label: "Currency" },
  { value: "items", label: "Items" },
  { value: "bundles", label: "Bundles" },
  { value: "vip", label: "VIP" },
];

const defaultProduct: Omit<ShopProduct, "id"> = {
  name: "",
  description: "",
  price: 0,
  category: "items",
  image_url: "",
  item_id: 0,
  quantity: 1,
  is_active: true,
  is_featured: false,
};

export function WebshopManager() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [editData, setEditData] = useState<Omit<ShopProduct, "id">>(defaultProduct);
  const [isEditing, setIsEditing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://woiendgame.online/api/webshop_admin.php?action=list", {
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.success && data.products) {
        setProducts(data.products);
      } else {
        // Demo data
        setProducts([
          { id: 1, name: "Phoenix Wing", description: "Legendary fashion wings", price: 9.99, category: "fashion", image_url: "/placeholder.svg", item_id: 5001, quantity: 1, is_active: true, is_featured: true },
          { id: 2, name: "Dragon Egg", description: "Rare pet egg", price: 14.99, category: "pets", image_url: "/placeholder.svg", item_id: 6001, quantity: 1, is_active: true, is_featured: false },
          { id: 3, name: "1000 Zen", description: "In-game currency", price: 4.99, category: "currency", image_url: "/placeholder.svg", item_id: 0, quantity: 1000, is_active: true, is_featured: false },
          { id: 4, name: "VIP 30 Days", description: "Premium membership", price: 19.99, category: "vip", image_url: "/placeholder.svg", item_id: 7001, quantity: 1, is_active: true, is_featured: true },
        ]);
      }
    } catch {
      // Demo data
      setProducts([
        { id: 1, name: "Phoenix Wing", description: "Legendary fashion wings", price: 9.99, category: "fashion", image_url: "/placeholder.svg", item_id: 5001, quantity: 1, is_active: true, is_featured: true },
        { id: 2, name: "Dragon Egg", description: "Rare pet egg", price: 14.99, category: "pets", image_url: "/placeholder.svg", item_id: 6001, quantity: 1, is_active: true, is_featured: false },
        { id: 3, name: "1000 Zen", description: "In-game currency", price: 4.99, category: "currency", image_url: "/placeholder.svg", item_id: 0, quantity: 1000, is_active: true, is_featured: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setEditData(defaultProduct);
    setIsEditing(true);
  };

  const handleEdit = (product: ShopProduct) => {
    setSelectedProduct(product);
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image_url: product.image_url,
      item_id: product.item_id,
      quantity: product.quantity,
      is_active: product.is_active,
      is_featured: product.is_featured,
    });
    setIsEditing(true);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setIsEditing(false);
    setEditData(defaultProduct);
  };

  const handleSave = async () => {
    if (!editData.name.trim()) {
      toast({ title: "Error", description: "Please enter product name", variant: "destructive" });
      return;
    }

    if (editData.price <= 0) {
      toast({ title: "Error", description: "Please enter a valid price", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = selectedProduct
        ? "https://woiendgame.online/api/webshop_admin.php?action=update"
        : "https://woiendgame.online/api/webshop_admin.php?action=add";

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          id: selectedProduct?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: "Success", description: selectedProduct ? "Product updated!" : "Product added!" });
        fetchProducts();
        handleCloseModal();
      } else {
        // Demo mode
        if (selectedProduct) {
          setProducts(products.map(p => p.id === selectedProduct.id ? { ...editData, id: selectedProduct.id } : p));
        } else {
          setProducts([...products, { ...editData, id: Date.now() }]);
        }
        toast({ title: "Success (Demo)", description: selectedProduct ? "Product updated locally" : "Product added locally" });
        handleCloseModal();
      }
    } catch {
      // Demo mode
      if (selectedProduct) {
        setProducts(products.map(p => p.id === selectedProduct.id ? { ...editData, id: selectedProduct.id } : p));
      } else {
        setProducts([...products, { ...editData, id: Date.now() }]);
      }
      toast({ title: "Success (Demo)", description: selectedProduct ? "Product updated locally" : "Product added locally" });
      handleCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch("https://woiendgame.online/api/webshop_admin.php?action=delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: "Deleted", description: "Product removed." });
        fetchProducts();
      } else {
        setProducts(products.filter(p => p.id !== id));
        toast({ title: "Deleted (Demo)", description: "Product removed locally" });
      }
    } catch {
      setProducts(products.filter(p => p.id !== id));
      toast({ title: "Deleted (Demo)", description: "Product removed locally" });
    }
  };

  const handleToggleActive = async (id: number, is_active: boolean) => {
    try {
      await fetch("https://woiendgame.online/api/webshop_admin.php?action=toggle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active }),
      });
    } catch {
      // Demo mode
    }
    setProducts(products.map(p => p.id === id ? { ...p, is_active } : p));
  };

  const filteredProducts = products.filter(p => 
    filterCategory === "all" || p.category === filterCategory
  );

  const ProductFormContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium mb-2 block">Product Name</label>
          <Input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            placeholder="e.g., Phoenix Wing"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          placeholder="Product description..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1">
            <Euro className="h-3 w-3" /> Price (EUR)
          </label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={editData.price}
            onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1">
            <Tag className="h-3 w-3" /> Category
          </label>
          <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Item ID (in-game)</label>
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
        <label className="text-sm font-medium mb-2 block flex items-center gap-1">
          <ImageIcon className="h-3 w-3" /> Image URL
        </label>
        <Input
          value={editData.image_url}
          onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border">
        <span className="text-sm font-medium">Active</span>
        <Switch
          checked={editData.is_active}
          onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border">
        <span className="text-sm font-medium">Featured</span>
        <Switch
          checked={editData.is_featured}
          onCheckedChange={(checked) => setEditData({ ...editData, is_featured: checked })}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={isSubmitting} className="flex-1">
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : selectedProduct ? "Update Product" : "Add Product"}
        </Button>
        <Button variant="outline" onClick={handleCloseModal}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5" />
                Webshop Products
              </CardTitle>
              <CardDescription>
                Manage shop items and pricing
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No products found</p>
              <Button onClick={handleAddNew} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Product
              </Button>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className={`p-3 rounded-lg border bg-card/50 space-y-2 ${!product.is_active ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        {product.is_featured && (
                          <Badge className="text-xs">Featured</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{product.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <Badge variant="outline">{product.category}</Badge>
                        <span className="text-green-500 font-medium">€{product.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Item ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className={!product.is_active ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        {product.is_featured && <Badge className="text-xs">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-green-500 font-medium">
                      €{product.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.item_id > 0 ? `#${product.item_id}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={(checked) => handleToggleActive(product.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(product.id)}
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

      {/* Edit/Add Modal */}
      {isMobile ? (
        <Drawer open={isEditing} onOpenChange={(open) => !open && handleCloseModal()}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{selectedProduct ? "Edit Product" : "Add Product"}</DrawerTitle>
              <DrawerDescription>Configure product details</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <ProductFormContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isEditing} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? "Edit Product" : "Add Product"}</DialogTitle>
              <DialogDescription>Configure product details</DialogDescription>
            </DialogHeader>
            <ProductFormContent />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
