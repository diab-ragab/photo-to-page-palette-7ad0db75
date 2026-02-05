 import { useState, useEffect } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 import { Badge } from "@/components/ui/badge";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
 import { useToast } from "@/hooks/use-toast";
 import { Gem, Coins, Plus, Edit, Trash2, Crown, Sparkles, Loader2 } from "lucide-react";
 import {
   TopUpPackage,
   TopUpPackageFormData,
   fetchAdminPackages,
   createPackage,
   updatePackage,
   deletePackage,
   togglePackage,
 } from "@/lib/currencyTopupApi";
 
 const formatNumber = (num: number): string => {
   if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
   if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
   return num.toString();
 };
 
 const defaultFormData: TopUpPackageFormData = {
   currency_type: 'zen',
   amount: 100000,
   bonus_amount: 0,
   price: 0.99,
   is_popular: false,
   is_best_value: false,
   is_active: true,
   sort_order: 0,
 };
 
 export function CurrencyTopUpManager() {
   const { toast } = useToast();
   const [packages, setPackages] = useState<TopUpPackage[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isSaving, setIsSaving] = useState(false);
   
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [editingPackage, setEditingPackage] = useState<TopUpPackage | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<TopUpPackage | null>(null);
   const [formData, setFormData] = useState<TopUpPackageFormData>(defaultFormData);
 
   const loadPackages = async () => {
     setIsLoading(true);
     try {
       const data = await fetchAdminPackages();
       setPackages(data);
     } catch (err) {
       toast({
         title: "Failed to load packages",
         description: err instanceof Error ? err.message : "Unknown error",
         variant: "destructive",
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => {
     loadPackages();
   }, []);
 
   const handleOpenCreate = () => {
     setEditingPackage(null);
     setFormData(defaultFormData);
     setIsDialogOpen(true);
   };
 
   const handleOpenEdit = (pkg: TopUpPackage) => {
     setEditingPackage(pkg);
     setFormData({
       currency_type: pkg.currency_type,
       amount: pkg.amount,
       bonus_amount: pkg.bonus_amount,
       price: pkg.price,
       is_popular: pkg.is_popular,
       is_best_value: pkg.is_best_value,
       is_active: pkg.is_active ?? true,
       sort_order: pkg.sort_order,
     });
     setIsDialogOpen(true);
   };
 
   const handleSave = async () => {
     if (formData.amount <= 0 || formData.price <= 0) {
       toast({
         title: "Invalid data",
         description: "Amount and price must be greater than 0",
         variant: "destructive",
       });
       return;
     }
 
     setIsSaving(true);
     try {
       if (editingPackage) {
         await updatePackage(editingPackage.id, formData);
         toast({ title: "Package updated successfully" });
       } else {
         await createPackage(formData);
         toast({ title: "Package created successfully" });
       }
       setIsDialogOpen(false);
       loadPackages();
     } catch (err) {
       toast({
         title: "Failed to save package",
         description: err instanceof Error ? err.message : "Unknown error",
         variant: "destructive",
       });
     } finally {
       setIsSaving(false);
     }
   };
 
   const handleDelete = async () => {
     if (!deleteTarget) return;
     
     try {
       await deletePackage(deleteTarget.id);
       toast({ title: "Package deleted successfully" });
       setIsDeleteDialogOpen(false);
       setDeleteTarget(null);
       loadPackages();
     } catch (err) {
       toast({
         title: "Failed to delete package",
         description: err instanceof Error ? err.message : "Unknown error",
         variant: "destructive",
       });
     }
   };
 
   const handleToggle = async (pkg: TopUpPackage) => {
     try {
       await togglePackage(pkg.id, !pkg.is_active);
       loadPackages();
     } catch (err) {
       toast({
         title: "Failed to toggle status",
         description: err instanceof Error ? err.message : "Unknown error",
         variant: "destructive",
       });
     }
   };
 
   const zenPackages = packages.filter(p => p.currency_type === 'zen');
   const coinsPackages = packages.filter(p => p.currency_type === 'coins');
 
   return (
     <div className="space-y-6">
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle className="flex items-center gap-2">
               <Gem className="h-5 w-5 text-purple-400" />
               Currency Top-Up Packages
             </CardTitle>
             <CardDescription>
               Manage Zen and Coins purchase packages
             </CardDescription>
           </div>
           <Button onClick={handleOpenCreate} className="gap-2">
             <Plus className="h-4 w-4" />
             Add Package
           </Button>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <div className="flex items-center justify-center py-8">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
           ) : packages.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               No packages configured. Click "Add Package" to create one.
             </div>
           ) : (
             <div className="space-y-6">
               {/* Zen Packages */}
               <div>
                 <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                   <Gem className="h-5 w-5 text-purple-400" />
                   Zen Packages ({zenPackages.length})
                 </h3>
                 {zenPackages.length > 0 ? (
                   <PackagesTable 
                     packages={zenPackages} 
                     onEdit={handleOpenEdit}
                     onDelete={(pkg) => { setDeleteTarget(pkg); setIsDeleteDialogOpen(true); }}
                     onToggle={handleToggle}
                   />
                 ) : (
                   <p className="text-sm text-muted-foreground">No Zen packages yet.</p>
                 )}
               </div>
 
               {/* Coins Packages */}
               <div>
                 <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                   <Coins className="h-5 w-5 text-yellow-400" />
                   Coins Packages ({coinsPackages.length})
                 </h3>
                 {coinsPackages.length > 0 ? (
                   <PackagesTable 
                     packages={coinsPackages} 
                     onEdit={handleOpenEdit}
                     onDelete={(pkg) => { setDeleteTarget(pkg); setIsDeleteDialogOpen(true); }}
                     onToggle={handleToggle}
                   />
                 ) : (
                   <p className="text-sm text-muted-foreground">No Coins packages yet.</p>
                 )}
               </div>
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Create/Edit Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>{editingPackage ? "Edit Package" : "Create Package"}</DialogTitle>
             <DialogDescription>
               {editingPackage ? "Update the package details" : "Add a new currency package"}
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Currency Type</Label>
                 <Select 
                   value={formData.currency_type} 
                   onValueChange={(v) => setFormData(prev => ({ ...prev, currency_type: v as 'zen' | 'coins' }))}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="zen">
                       <span className="flex items-center gap-2">
                         <Gem className="h-4 w-4 text-purple-400" /> Zen
                       </span>
                     </SelectItem>
                     <SelectItem value="coins">
                       <span className="flex items-center gap-2">
                         <Coins className="h-4 w-4 text-yellow-400" /> Coins
                       </span>
                     </SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Price (€)</Label>
                 <Input
                   type="number"
                   step="0.01"
                   min="0.01"
                   value={formData.price}
                   onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                 />
               </div>
             </div>
 
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Amount</Label>
                 <Input
                   type="number"
                   min="1"
                   value={formData.amount}
                   onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                 />
               </div>
               <div className="space-y-2">
                 <Label>Bonus Amount</Label>
                 <Input
                   type="number"
                   min="0"
                   value={formData.bonus_amount}
                   onChange={(e) => setFormData(prev => ({ ...prev, bonus_amount: parseInt(e.target.value) || 0 }))}
                 />
               </div>
             </div>
 
             <div className="space-y-2">
               <Label>Sort Order</Label>
               <Input
                 type="number"
                 min="0"
                 value={formData.sort_order}
                 onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
               />
             </div>
 
             <div className="flex flex-wrap gap-6 pt-2">
               <div className="flex items-center gap-2">
                 <Switch
                   checked={formData.is_active}
                   onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
                 />
                 <Label>Active</Label>
               </div>
               <div className="flex items-center gap-2">
                 <Switch
                   checked={formData.is_popular}
                   onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_popular: v }))}
                 />
                 <Label className="flex items-center gap-1">
                   <Crown className="h-4 w-4 text-primary" /> Popular
                 </Label>
               </div>
               <div className="flex items-center gap-2">
                 <Switch
                   checked={formData.is_best_value}
                   onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_best_value: v }))}
                 />
                 <Label className="flex items-center gap-1">
                   <Sparkles className="h-4 w-4 text-green-500" /> Best Value
                 </Label>
               </div>
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleSave} disabled={isSaving}>
               {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
               {editingPackage ? "Update" : "Create"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Delete Confirmation */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Package?</AlertDialogTitle>
             <AlertDialogDescription>
               This will permanently delete the {deleteTarget?.currency_type} package for {formatNumber(deleteTarget?.amount || 0)}.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
               Delete
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 }
 
 // Table component
 interface PackagesTableProps {
   packages: TopUpPackage[];
   onEdit: (pkg: TopUpPackage) => void;
   onDelete: (pkg: TopUpPackage) => void;
   onToggle: (pkg: TopUpPackage) => void;
 }
 
 function PackagesTable({ packages, onEdit, onDelete, onToggle }: PackagesTableProps) {
   return (
     <div className="border rounded-lg overflow-hidden">
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead>Amount</TableHead>
             <TableHead>Bonus</TableHead>
             <TableHead>Price</TableHead>
             <TableHead>Badges</TableHead>
             <TableHead>Status</TableHead>
             <TableHead className="text-right">Actions</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {packages.map((pkg) => (
             <TableRow key={pkg.id}>
               <TableCell className="font-medium">{formatNumber(pkg.amount)}</TableCell>
               <TableCell>
                 {pkg.bonus_amount > 0 ? (
                   <span className="text-green-500">+{formatNumber(pkg.bonus_amount)}</span>
                 ) : (
                   <span className="text-muted-foreground">-</span>
                 )}
               </TableCell>
               <TableCell>€{pkg.price.toFixed(2)}</TableCell>
               <TableCell>
                 <div className="flex gap-1">
                   {pkg.is_popular && (
                     <Badge variant="default" className="text-xs">
                       <Crown className="h-3 w-3 mr-1" /> Popular
                     </Badge>
                   )}
                   {pkg.is_best_value && (
                     <Badge className="bg-green-500 text-xs">
                       <Sparkles className="h-3 w-3 mr-1" /> Best
                     </Badge>
                   )}
                 </div>
               </TableCell>
               <TableCell>
                 <Switch
                   checked={pkg.is_active}
                   onCheckedChange={() => onToggle(pkg)}
                 />
               </TableCell>
               <TableCell className="text-right">
                 <div className="flex justify-end gap-2">
                   <Button variant="ghost" size="icon" onClick={() => onEdit(pkg)}>
                     <Edit className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" onClick={() => onDelete(pkg)}>
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                 </div>
               </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
     </div>
   );
 }