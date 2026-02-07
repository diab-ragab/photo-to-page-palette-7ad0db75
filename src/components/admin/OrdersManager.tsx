import { useState, useEffect } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/apiFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  Truck,
  Ban,
  Gift
} from "lucide-react";
import { format } from "date-fns";

// Simplified Order interface matching new schema
interface Order {
  id: number;
  user_id: number;
  username?: string;
  product_id: number;
  product_name?: string;
  quantity: number;
  total_real: number;
  status: "pending" | "completed" | "failed" | "refunded";
  stripe_session_id?: string;
  stripe_payment_intent?: string;
  delivered_at: string | null;
  created_at: string;
  updated_at?: string;
}

interface BundleOrder {
  id: number;
  user_id: number;
  username?: string;
  bundle_id: number;
  bundle_name?: string;
  character_id: number;
  character_name?: string;
  total_real: number;
  status: "pending" | "completed" | "failed" | "refunded";
  stripe_session_id?: string;
  stripe_payment_intent?: string;
  delivered_at: string | null;
  created_at: string;
}

interface OrdersResponse {
  success: boolean;
  orders: Order[];
  total: number;
  page: number;
  pages: number;
}

interface BundleOrdersResponse {
  success: boolean;
  orders: BundleOrder[];
  total: number;
  page: number;
  pages: number;
}

// Uses centralized API_BASE and getAuthHeaders from apiFetch

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  refunded: {
    label: "Refunded",
    icon: RotateCcw,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

export function OrdersManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");
  
  // Product orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Bundle orders state
  const [bundleOrders, setBundleOrders] = useState<BundleOrder[]>([]);
  const [bundleLoading, setBundleLoading] = useState(true);
  const [bundlePage, setBundlePage] = useState(1);
  const [bundleTotalPages, setBundleTotalPages] = useState(1);
  const [bundleTotal, setBundleTotal] = useState(0);
  const [bundleStatusFilter, setBundleStatusFilter] = useState<string>("all");
  const [bundleSearchQuery, setBundleSearchQuery] = useState("");
  const [selectedBundleOrder, setSelectedBundleOrder] = useState<BundleOrder | null>(null);
  const [bundleDetailsOpen, setBundleDetailsOpen] = useState(false);

  const fetchOrders = async (pageNum: number, status?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: "list_orders",
        page: String(pageNum),
        limit: "15",
      });
      
      if (status && status !== "all") {
        params.append("status", status);
      }

      const res = await fetch(`${API_BASE}/webshop_admin.php?${params.toString()}`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data: OrdersResponse = await res.json();
      
      if (data.success) {
        setOrders(data.orders);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBundleOrders = async (pageNum: number, status?: string) => {
    setBundleLoading(true);
    try {
      const params = new URLSearchParams({
        action: "list_bundle_orders",
        page: String(pageNum),
        limit: "15",
      });
      
      if (status && status !== "all") {
        params.append("status", status);
      }

      const res = await fetch(`${API_BASE}/bundles.php?${params.toString()}`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data: BundleOrdersResponse = await res.json();
      
      if (data.success) {
        setBundleOrders(data.orders);
        setBundleTotalPages(data.pages);
        setBundleTotal(data.total);
        setBundlePage(data.page);
      }
    } catch (err) {
      console.error("Failed to fetch bundle orders:", err);
    } finally {
      setBundleLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, statusFilter);
  }, [statusFilter]);
  
  useEffect(() => {
    fetchBundleOrders(1, bundleStatusFilter);
  }, [bundleStatusFilter]);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/webshop_admin.php?action=update_order`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Order Updated",
          description: `Order #${orderId} marked as ${newStatus}`,
        });
        fetchOrders(page, statusFilter);
        setDetailsOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update order",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleUpdateBundleStatus = async (orderId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bundles.php`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "update_order_status", id: orderId, status: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Bundle Order Updated",
          description: `Order #${orderId} marked as ${newStatus}`,
        });
        fetchBundleOrders(bundlePage, bundleStatusFilter);
        setBundleDetailsOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update order",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (amount: number): string => {
    if (amount > 0) {
      return `€${Number(amount).toFixed(2)}`;
    }
    return "Free";
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id.toString().includes(query) ||
      order.username?.toLowerCase().includes(query) ||
      order.product_name?.toLowerCase().includes(query)
    );
  });
  
  const filteredBundleOrders = bundleOrders.filter((order) => {
    if (!bundleSearchQuery) return true;
    const query = bundleSearchQuery.toLowerCase();
    return (
      order.id.toString().includes(query) ||
      order.username?.toLowerCase().includes(query) ||
      order.bundle_name?.toLowerCase().includes(query) ||
      order.character_name?.toLowerCase().includes(query)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Orders Management
            </CardTitle>
            <CardDescription>
              View and manage all customer orders
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products ({total})
            </TabsTrigger>
            <TabsTrigger value="bundles" className="gap-2">
              <Gift className="h-4 w-4" />
              Bundles ({bundleTotal})
            </TabsTrigger>
          </TabsList>
          
          {/* Product Orders Tab */}
          <TabsContent value="products" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, username, or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchOrders(page, statusFilter)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Orders Table */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No orders found</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const status = statusConfig[order.status];
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">#{order.id}</TableCell>
                          <TableCell>
                            <span className="font-medium">{order.username || `User #${order.user_id}`}</span>
                          </TableCell>
                          <TableCell>
                            <span>{order.product_name || `Product #${order.product_id}`}</span>
                            {order.quantity > 1 && (
                              <span className="text-muted-foreground ml-1">×{order.quantity}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{formatPrice(order.total_real)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={status.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(order.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchOrders(page - 1, statusFilter)}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchOrders(page + 1, statusFilter)}
                  disabled={page >= totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Bundle Orders Tab */}
          <TabsContent value="bundles" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, username, bundle, or character..."
                  value={bundleSearchQuery}
                  onChange={(e) => setBundleSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={bundleStatusFilter} onValueChange={setBundleStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchBundleOrders(bundlePage, bundleStatusFilter)}
                disabled={bundleLoading}
              >
                <RefreshCw className={`h-4 w-4 ${bundleLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Bundle Orders Table */}
            {bundleLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredBundleOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No bundle orders found</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Bundle</TableHead>
                      <TableHead>Character</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBundleOrders.map((order) => {
                      const status = statusConfig[order.status];
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">#{order.id}</TableCell>
                          <TableCell>
                            <span className="font-medium">{order.username || `User #${order.user_id}`}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🎉</span>
                              <span>{order.bundle_name || `Bundle #${order.bundle_id}`}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.character_name || `#${order.character_id}`}
                          </TableCell>
                          <TableCell className="font-medium">{formatPrice(order.total_real)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={status.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(order.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBundleOrder(order);
                                setBundleDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {bundleTotalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBundleOrders(bundlePage - 1, bundleStatusFilter)}
                  disabled={bundlePage <= 1 || bundleLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {bundlePage} of {bundleTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBundleOrders(bundlePage + 1, bundleStatusFilter)}
                  disabled={bundlePage >= bundleTotalPages || bundleLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Product Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              View order details and update status
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <p className="font-medium">{selectedOrder.username || `User #${selectedOrder.user_id}`}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Product</span>
                  <p className="font-medium">{selectedOrder.product_name || `Product #${selectedOrder.product_id}`}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity</span>
                  <p className="font-medium">{selectedOrder.quantity}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="font-medium">{formatPrice(selectedOrder.total_real)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), "PPpp")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivered</span>
                  <p className="font-medium">
                    {selectedOrder.delivered_at 
                      ? format(new Date(selectedOrder.delivered_at), "PPpp") 
                      : "Not delivered"}
                  </p>
                </div>
              </div>

              {(selectedOrder.stripe_session_id || selectedOrder.stripe_payment_intent) && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                  <p className="text-muted-foreground">Stripe Session ID:</p>
                  <p className="font-mono break-all">{selectedOrder.stripe_session_id || "N/A"}</p>
                  <p className="text-muted-foreground mt-2">Payment Intent:</p>
                  <p className="font-mono break-all">{selectedOrder.stripe_payment_intent || "N/A"}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className={statusConfig[selectedOrder.status].className}>
                  {statusConfig[selectedOrder.status].label}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedOrder?.status === "pending" && (
              <>
                <Button
                  variant="default"
                  onClick={() => handleUpdateStatus(selectedOrder.id, "completed")}
                  disabled={actionLoading}
                  className="gap-2"
                >
                  <Truck className="h-4 w-4" />
                  Mark Delivered
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleUpdateStatus(selectedOrder.id, "failed")}
                  disabled={actionLoading}
                  className="gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Mark Failed
                </Button>
              </>
            )}
            {selectedOrder?.status === "completed" && (
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus(selectedOrder.id, "refunded")}
                disabled={actionLoading}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Mark Refunded
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bundle Order Details Dialog */}
      <Dialog open={bundleDetailsOpen} onOpenChange={setBundleDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              Bundle Order #{selectedBundleOrder?.id}
            </DialogTitle>
            <DialogDescription>
              View bundle order details and update status
            </DialogDescription>
          </DialogHeader>

          {selectedBundleOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <p className="font-medium">{selectedBundleOrder.username || `User #${selectedBundleOrder.user_id}`}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bundle</span>
                  <p className="font-medium">{selectedBundleOrder.bundle_name || `Bundle #${selectedBundleOrder.bundle_id}`}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Character</span>
                  <p className="font-medium">{selectedBundleOrder.character_name || `#${selectedBundleOrder.character_id}`}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="font-medium">{formatPrice(selectedBundleOrder.total_real)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{format(new Date(selectedBundleOrder.created_at), "PPpp")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivered</span>
                  <p className="font-medium">
                    {selectedBundleOrder.delivered_at 
                      ? format(new Date(selectedBundleOrder.delivered_at), "PPpp") 
                      : "Not delivered"}
                  </p>
                </div>
              </div>

              {(selectedBundleOrder.stripe_session_id || selectedBundleOrder.stripe_payment_intent) && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                  <p className="text-muted-foreground">Stripe Session ID:</p>
                  <p className="font-mono break-all">{selectedBundleOrder.stripe_session_id || "N/A"}</p>
                  <p className="text-muted-foreground mt-2">Payment Intent:</p>
                  <p className="font-mono break-all">{selectedBundleOrder.stripe_payment_intent || "N/A"}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className={statusConfig[selectedBundleOrder.status].className}>
                  {statusConfig[selectedBundleOrder.status].label}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedBundleOrder?.status === "pending" && (
              <>
                <Button
                  variant="default"
                  onClick={() => handleUpdateBundleStatus(selectedBundleOrder.id, "completed")}
                  disabled={actionLoading}
                  className="gap-2"
                >
                  <Truck className="h-4 w-4" />
                  Mark Delivered
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleUpdateBundleStatus(selectedBundleOrder.id, "failed")}
                  disabled={actionLoading}
                  className="gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Mark Failed
                </Button>
              </>
            )}
            {selectedBundleOrder?.status === "completed" && (
              <Button
                variant="outline"
                onClick={() => handleUpdateBundleStatus(selectedBundleOrder.id, "refunded")}
                disabled={actionLoading}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Mark Refunded
              </Button>
            )}
            <Button variant="ghost" onClick={() => setBundleDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
