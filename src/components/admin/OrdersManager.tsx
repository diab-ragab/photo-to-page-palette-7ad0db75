import { useState, useEffect } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/apiFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { format } from "date-fns";

interface ShopOrder {
  id: number;
  rid: string;
  account_name: string;
  character_name: string;
  total_cents: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  paypal_order_id: string | null;
  capture_id: string | null;
  payer_email: string;
  ip: string;
  created_at: string;
  updated_at: string;
}

interface OrdersResponse {
  success: boolean;
  orders: ShopOrder[];
  total: number;
  page: number;
  pages: number;
  rid: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  processing: {
    label: "Processing",
    icon: RefreshCw,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
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
};

export function OrdersManager() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  const fetchOrders = async (pageNum: number, status?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
      });
      if (status && status !== "all") params.append("status", status);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const token = localStorage.getItem("woi_session_token") || "";
      if (token) params.append("sessionToken", token);

      const res = await fetch(`${API_BASE}/admin_orders.php?${params.toString()}`, {
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
        toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect to server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, statusFilter);
  }, [statusFilter]);

  const handleSearch = () => {
    fetchOrders(1, statusFilter);
  };

  const handleRetryDelivery = async (orderId: number) => {
    setRetryLoading(true);
    try {
      const token = localStorage.getItem("woi_session_token") || "";
      const res = await fetch(`${API_BASE}/admin_retry_delivery.php?sessionToken=${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Delivery Retried",
          description: `Order #${orderId}: ${data.processed_count} delivered, ${data.skipped_count} skipped, ${data.failed_count} failed`,
        });
        fetchOrders(page, statusFilter);
        setDetailsOpen(false);
      } else {
        toast({ title: "Error", description: data.message || "Retry failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to retry delivery", variant: "destructive" });
    } finally {
      setRetryLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string): string => {
    if (cents <= 0) return "Free";
    const symbol = currency === "EUR" ? "€" : currency;
    return `${symbol}${(cents / 100).toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shop Orders
            </CardTitle>
            <CardDescription>View and manage all shop orders ({total})</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, PayPal ID, account, character..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchOrders(page, statusFilter)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
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
                  <TableHead>Account</TableHead>
                  <TableHead>Character</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const st = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = st.icon;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">#{order.id}</TableCell>
                      <TableCell className="font-medium">{order.account_name}</TableCell>
                      <TableCell>{order.character_name}</TableCell>
                      <TableCell className="font-medium">{formatPrice(Number(order.total_cents), order.currency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={st.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(order.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setDetailsOpen(true); }}>
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
            <Button variant="outline" size="sm" onClick={() => fetchOrders(page - 1, statusFilter)} disabled={page <= 1 || loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => fetchOrders(page + 1, statusFilter)} disabled={page >= totalPages || loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>Order details and delivery actions</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Account</span>
                  <p className="font-medium">{selectedOrder.account_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Character</span>
                  <p className="font-medium">{selectedOrder.character_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="font-medium">{formatPrice(Number(selectedOrder.total_cents), selectedOrder.currency)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={statusConfig[selectedOrder.status]?.className}>
                    {statusConfig[selectedOrder.status]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), "PPpp")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">RID</span>
                  <p className="font-mono text-xs">{selectedOrder.rid}</p>
                </div>
              </div>

              {(selectedOrder.paypal_order_id || selectedOrder.capture_id) && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                  <p className="text-muted-foreground">PayPal Order ID:</p>
                  <p className="font-mono break-all">{selectedOrder.paypal_order_id || "N/A"}</p>
                  <p className="text-muted-foreground mt-2">Capture ID:</p>
                  <p className="font-mono break-all">{selectedOrder.capture_id || "N/A"}</p>
                  {selectedOrder.payer_email && (
                    <>
                      <p className="text-muted-foreground mt-2">Payer Email:</p>
                      <p className="font-mono break-all">{selectedOrder.payer_email}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedOrder && (selectedOrder.status === "completed" || selectedOrder.status === "failed") && (
              <Button
                variant="default"
                onClick={() => handleRetryDelivery(selectedOrder.id)}
                disabled={retryLoading}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {retryLoading ? "Retrying..." : "Retry Delivery"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
