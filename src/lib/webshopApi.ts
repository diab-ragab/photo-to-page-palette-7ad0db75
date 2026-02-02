/**
 * Webshop API client for fetching products and categories from PHP backend
 * Simplified schema: webshop_products(id, name, item_id, item_quantity)
 */

const API_BASE = "https://woiendgame.online/api";

export interface WebshopProduct {
  id: number;
  name: string;
  item_id: number;       // >0 = game item, -1 = Zen, -2 = Coins, -3 = EXP
  item_quantity: number; // Amount to grant per purchase
  price_real?: number;   // EUR price (optional, may come from separate pricing)
  description?: string;  // Optional description
  image_url?: string;    // Optional image
  is_active?: boolean;   // Optional active flag
}

export interface ProductsResponse {
  success: boolean;
  products: WebshopProduct[];
  total: number;
  page: number;
  pages: number;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("woi_session_token") || "";
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(token ? { "X-Session-Token": token, "Authorization": `Bearer ${token}` } : {}),
  };
}

// Public endpoint for all users to view products
export async function fetchProducts(options?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ProductsResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.search) params.append("search", options.search);
    if (options?.page) params.append("page", String(options.page));
    if (options?.limit) params.append("limit", String(options.limit));

    const res = await fetch(`${API_BASE}/webshop_products.php?${params.toString()}`, {
      // Public endpoint: do not send cookies, otherwise CORS will block in preview domains.
      credentials: "omit",
    });
    const data: ProductsResponse = await res.json();
    if (data.success) {
      return data;
    }
    return { success: false, products: [], total: 0, page: 1, pages: 0 };
  } catch {
    console.error("Failed to fetch products");
    return { success: false, products: [], total: 0, page: 1, pages: 0 };
  }
}

// Admin-only endpoint for product management
export async function fetchProductsAdmin(options?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ProductsResponse> {
  try {
    const params = new URLSearchParams({ action: "list_products" });
    if (options?.search) params.append("search", options.search);
    if (options?.page) params.append("page", String(options.page));
    if (options?.limit) params.append("limit", String(options.limit));

    const res = await fetch(`${API_BASE}/webshop_admin.php?${params.toString()}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    const data: ProductsResponse = await res.json();
    if (data.success) {
      return data;
    }
    return { success: false, products: [], total: 0, page: 1, pages: 0 };
  } catch {
    console.error("Failed to fetch products");
    return { success: false, products: [], total: 0, page: 1, pages: 0 };
  }
}

export async function addProduct(product: Partial<WebshopProduct>): Promise<{ success: boolean; id?: number; message?: string }> {
  const res = await fetch(`${API_BASE}/webshop_admin.php?action=add_product`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function updateProduct(product: Partial<WebshopProduct> & { id: number }): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/webshop_admin.php?action=update_product`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function deleteProduct(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/webshop_admin.php?action=delete_product`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ id }),
  });
  return res.json();
}
