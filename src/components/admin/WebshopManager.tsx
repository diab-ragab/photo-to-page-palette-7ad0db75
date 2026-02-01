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
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw
} from "lucide-react";
import {
  fetchProducts,
  fetchCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  addCategory,
  WebshopProduct,
  WebshopCategory,
} from "@/lib/webshopApi";

interface ProductFormData {
  name: string;
  description: string;
  category_id: number;
  item_id: number;
  item_quantity: number;
  price_coins: number;
  price_vip: number;
  price_zen: number;
  price_real: number;
  image_url: string;
  stripe_payment_link: string;
  is_active: boolean;
  is_featured: boolean;
  stock: number;
}

const defaultProduct: ProductFormData = {
  name: "",
  description: "",
  category_id: 1,
  item_id: 0,
  item_quantity: 1,
  price_coins: 0,
  price_vip: 0,
  price_zen: 0,
  price_real: 0,
  image_url: "",
  stripe_payment_link: "",
  is_active: true,
  is_featured: false,
  stock: -1,
};

export function WebshopManager() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [products, setProducts] = useState<WebshopProduct[]>([]);
  const [categories, setCategories] = useState<WebshopCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<WebshopProduct | null>(null);
  const [editData, setEditData] = useState<ProductFormData>(defaultProduct);
  const [isEditing, setIsEditing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        fetchProducts({ limit: 100 }),
        fetchCategories(),
      ]);
      setProducts(productsData.products);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setEditData({ ...defaultProduct, category_id: categories[0]?.id || 1 });
    setIsEditing(true);
  };

  const handleEdit = (product: WebshopProduct) => {
    setSelectedProduct(product);
    setEditData({
      name: product.name,
      description: product.description || "",
      category_id: product.category_id,
      item_id: product.item_id,
      item_quantity: product.item_quantity,
      price_coins: product.price_coins,
      price_vip: product.price_vip,
      price_zen: product.price_zen,
      price_real: product.price_real,
      image_url: product.image_url || "",
      stripe_payment_link: product.stripe_payment_link || "",
      is_active: product.is_active,
      is_featured: product.is_featured,
      stock: product.stock,
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

    if (editData.price_real <= 0 && editData.price_zen <= 0 && editData.price_coins <= 0) {
      toast({ title: "Error", description: "Please enter at least one price", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedProduct) {
        const result = await updateProduct({ id: selectedProduct.id, ...editData });
        if (result.success) {
          toast({ title: "Success", description: "Product updated!" });
          loadData();
          handleCloseModal();
        } else {
          toast({ title: "Error", description: result.message || "Failed to update", variant: "destructive" });
        }
      } else {
        const result = await addProduct(editData);
        if (result.success) {
          toast({ title: "Success", description: "Product added!" });
          loadData();
          handleCloseModal();
        } else {
          toast({ title: "Error", description: result.message || "Failed to add", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      const result = await deleteProduct(id);
      if (result.success) {
        toast({ title: "Deleted", description: "Product removed." });
        loadData();
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete", variant: "destructive" });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const result = await addCategory({ name: newCategoryName });
      if (result.success) {
        toast({ title: "Success", description: "Category added!" });
        setNewCategoryName("");
        setShowCategoryModal(false);
        loadData();
      } else {
        toast({ title: "Error", description: result.message || "Failed to add category", variant: "destructive" });
      }
    } catch (error) {
      console.error("Add category error:", error);
      toast({ title: "Error", description: "Failed to add category", variant: "destructive" });
    }
  };

  const filteredProducts = products.filter(p => 
    filterCategory === "all" || p.category_id === parseInt(filterCategory)
  );

  const ProductFormContent = () => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
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
            value={editData.price_real}
            onChange={(e) => setEditData({ ...editData, price_real: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1">
            <Tag className="h-3 w-3" /> Category
          </label>
          <Select 
            value={String(editData.category_id)} 
            onValueChange={(v) => setEditData({ ...editData, category_id: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Zen Price</label>
          <Input
            type="number"
            min={0}
            value={editData.price_zen}
            onChange={(e) => setEditData({ ...editData, price_zen: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Coins Price</label>
          <Input
            type="number"
            min={0}
            value={editData.price_coins}
            onChange={(e) => setEditData({ ...editData, price_coins: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">VIP Price</label>
          <Input
            type="number"
            min={0}
            value={editData.price_vip}
            onChange={(e) => setEditData({ ...editData, price_vip: parseInt(e.target.value) || 0 })}
          />
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
            value={editData.item_quantity}
            onChange={(e) => setEditData({ ...editData, item_quantity: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Stock (-1 = unlimited)</label>
        <Input
          type="number"
          min={-1}
          value={editData.stock}
          onChange={(e) => setEditData({ ...editData, stock: parseInt(e.target.value) })}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-1">
          <ImageIcon className="h-3 w-3" /> Image URL (or emoji)
        </label>
        <Input
          value={editData.image_url}
          onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
          placeholder="https://... or 🎁"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-1">
          <LinkIcon className="h-3 w-3" /> Stripe Payment Link
        </label>
        <Input
          value={editData.stripe_payment_link}
          onChange={(e) => setEditData({ ...editData, stripe_payment_link: e.target.value })}
          placeholder="https://buy.stripe.com/..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Create payment links at dashboard.stripe.com → Payment Links
        </p>
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
                Manage shop items, pricing, and Stripe payment links
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Category
              </Button>
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
                        <Badge variant="outline">{product.category_name}</Badge>
                        <span className="text-primary font-medium">€{Number(product.price_real).toFixed(2)}</span>
                        {product.stripe_payment_link && (
                          <Badge variant="secondary" className="text-xs">Stripe</Badge>
                        )}
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
                  <TableHead>Stripe</TableHead>
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
                      <Badge variant="outline">{product.category_name || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-primary font-medium">
                      €{Number(product.price_real).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.item_id || "—"}
                    </TableCell>
                    <TableCell>
                      {product.stripe_payment_link ? (
                        <Badge variant="secondary">Linked</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
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

      {/* Product Modal */}
      {isMobile ? (
        <Drawer open={isEditing} onOpenChange={(open) => !open && handleCloseModal()}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{selectedProduct ? "Edit Product" : "Add Product"}</DrawerTitle>
              <DrawerDescription>
                {selectedProduct ? "Update product details" : "Create a new product"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <ProductFormContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isEditing} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? "Edit Product" : "Add Product"}</DialogTitle>
              <DialogDescription>
                {selectedProduct ? "Update product details" : "Create a new product"}
              </DialogDescription>
            </DialogHeader>
            <ProductFormContent />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new product category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category Name</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Cosmetics"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddCategory} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Add Category
              </Button>
              <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
