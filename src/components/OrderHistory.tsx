import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  ShoppingBag
} from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: number;
  product_id: number;
  product_name: string | null;
  item_id: number;
  quantity: number;
  total_real: number;
  status: "pending" | "completed" | "failed" | "refunded";
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

const API_BASE = "https://woiendgame.online/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("woi_session_token") || "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { "X-Session-Token": token, Authorization: `Bearer ${token}` } : {}),
  };
}

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
    icon: RefreshCcw,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/user_orders.php?action=list&page=${pageNum}&limit=10`,
        {
          credentials: "include",
          headers: getAuthHeaders(),
        }
      );
      const data: OrdersResponse = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const formatPrice = (order: Order): string => {
    const totalReal = Number(order.total_real) || 0;
    if (totalReal > 0) {
      return `€${totalReal.toFixed(2)}`;
    }
    return "Free";
  };

  const getRewardLabel = (itemId: number): string => {
    if (itemId === -1) return "💎 Zen";
    if (itemId === -2) return "🪙 Coins";
    if (itemId === -3) return "⚡ EXP";
    return "🎁 Item";
  };

  if (loading && orders.length === 0) {
    return (
      <Card className="bg-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Order History
        </CardTitle>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">{total} orders</span>
        )}
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No orders yet</p>
            <p className="text-sm mt-1">Your purchases will appear here</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-3">
                {orders.map((order) => {
                  const status = statusConfig[order.status];
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                    {/* Product Icon */}
                      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 text-2xl">
                        {order.item_id === -1 ? "💎" : 
                         order.item_id === -2 ? "🪙" : 
                         order.item_id === -3 ? "⚡" : "🎁"}
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium truncate">
                              {order.product_name || `Order #${order.id}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {order.quantity} • {formatPrice(order)}
                            </p>
                          </div>
                          <Badge variant="outline" className={status.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(order.created_at), "MMM d, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchOrders(page - 1)}
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
                  onClick={() => fetchOrders(page + 1)}
                  disabled={page >= totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
