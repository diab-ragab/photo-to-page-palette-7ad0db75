import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  RefreshCw
} from "lucide-react";
import {
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  WebshopProduct,
} from "@/lib/webshopApi";

interface ProductFormData {
  name: string;
  item_id: number;
  item_quantity: number;
  price_real: number;
}

const defaultProduct: ProductFormData = {
  name: "",
  item_id: 0,
  item_quantity: 1,
  price_real: 0,
};

interface ProductFormContentProps {
  editData: ProductFormData;
  setEditData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  isSubmitting: boolean;
  selectedProduct: WebshopProduct | null;
  onSave: () => void;
  onClose: () => void;
}

const ProductFormContent = ({
  editData,
  setEditData,
  isSubmitting,
  selectedProduct,
  onSave,
  onClose,
}: ProductFormContentProps) => (
  <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
    <div>
      <label className="text-sm font-medium mb-2 block">Product Name</label>
      <Input
        value={editData.name}
        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="e.g., 1000 Zen Pack"
      />
    </div>

    <div>
      <label className="text-sm font-medium mb-2 block flex items-center gap-1">
        <Euro className="h-3 w-3" /> Price (EUR)
      </label>
      <Input
        type="number"
        step="0.01"
        min={0}
        value={editData.price_real}
        onChange={(e) => setEditData(prev => ({ ...prev, price_real: parseFloat(e.target.value) || 0 }))}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Reward Type</label>
        <Select 
          value={editData.item_id <= 0 ? String(editData.item_id) : "item"} 
          onValueChange={(v) => {
            if (v === "item") {
              setEditData(prev => ({ ...prev, item_id: 1 }));
            } else {
              setEditData(prev => ({ ...prev, item_id: parseInt(v) }));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="item">🎁 Game Item</SelectItem>
            <SelectItem value="-1">💎 Zen</SelectItem>
            <SelectItem value="-2">🪙 Coins</SelectItem>
            <SelectItem value="-3">⚡ EXP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {editData.item_id > 0 ? (
        <div>
          <label className="text-sm font-medium mb-2 block">Item ID (in-game)</label>
          <Input
            type="number"
            min={1}
            value={editData.item_id}
            onChange={(e) => setEditData(prev => ({ ...prev, item_id: parseInt(e.target.value) || 1 }))}
          />
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium mb-2 block">
            {editData.item_id === -1 ? "Zen Amount" : editData.item_id === -2 ? "Coins Amount" : "EXP Amount"}
          </label>
          <Input
            type="number"
            min={1}
            value={editData.item_quantity}
            onChange={(e) => setEditData(prev => ({ ...prev, item_quantity: parseInt(e.target.value) || 1 }))}
          />
        </div>
      )}
    </div>

    {editData.item_id > 0 && (
      <div>
        <label className="text-sm font-medium mb-2 block">Quantity per purchase</label>
        <Input
          type="number"
          min={1}
          value={editData.item_quantity}
          onChange={(e) => setEditData(prev => ({ ...prev, item_quantity: parseInt(e.target.value) || 1 }))}
        />
      </div>
    )}

    <div className="flex gap-2 pt-2">
      <Button onClick={onSave} disabled={isSubmitting} className="flex-1">
        <Save className="mr-2 h-4 w-4" />
        {isSubmitting ? "Saving..." : selectedProduct ? "Update Product" : "Add Product"}
      </Button>
      <Button variant="outline" onClick={onClose}>
        <X className="mr-2 h-4 w-4" />
        Cancel
      </Button>
    </div>
  </div>
);

export function WebshopManager() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [products, setProducts] = useState<WebshopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<WebshopProduct | null>(null);
  const [editData, setEditData] = useState<ProductFormData>(defaultProduct);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const productsData = await fetchProducts({ limit: 100 });
      setProducts(productsData.products);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setEditData({ ...defaultProduct });
    setIsEditing(true);
  };

  const handleEdit = (product: WebshopProduct) => {
    setSelectedProduct(product);
    setEditData({
      name: product.name,
      item_id: product.item_id,
      item_quantity: product.item_quantity,
      price_real: typeof product.price_real === 'string' ? parseFloat(product.price_real) : (product.price_real || 0),
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

    if (editData.price_real <= 0) {
      toast({ title: "Error", description: "Please enter a price", variant: "destructive" });
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

  const getRewardLabel = (product: WebshopProduct): string => {
    if (product.item_id === -1) return `💎 ${product.item_quantity.toLocaleString()} Zen`;
    if (product.item_id === -2) return `🪙 ${product.item_quantity.toLocaleString()} Coins`;
    if (product.item_id === -3) return `⚡ ${product.item_quantity.toLocaleString()} EXP`;
    if (product.item_id > 0) return `🎁 #${product.item_id} x${product.item_quantity}`;
    return "—";
  };

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
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
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
          ) : products.length === 0 ? (
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
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="p-3 rounded-lg border bg-card/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{product.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <Badge variant="outline">{getRewardLabel(product)}</Badge>
                        <span className="text-primary font-medium">€{Number(product.price_real || 0).toFixed(2)}</span>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">#{product.id}</TableCell>
                    <TableCell>
                      <span className="font-medium">{product.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRewardLabel(product)}</Badge>
                    </TableCell>
                    <TableCell className="text-primary font-medium">
                      €{Number(product.price_real || 0).toFixed(2)}
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
              <ProductFormContent 
                editData={editData}
                setEditData={setEditData}
                isSubmitting={isSubmitting}
                selectedProduct={selectedProduct}
                onSave={handleSave}
                onClose={handleCloseModal}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isEditing} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? "Edit Product" : "Add Product"}</DialogTitle>
              <DialogDescription>
                {selectedProduct ? "Update product details" : "Create a new product"}
              </DialogDescription>
            </DialogHeader>
            <ProductFormContent 
              editData={editData}
              setEditData={setEditData}
              isSubmitting={isSubmitting}
              selectedProduct={selectedProduct}
              onSave={handleSave}
              onClose={handleCloseModal}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
