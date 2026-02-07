import { API_BASE, getAuthHeaders } from './apiFetch';

export interface WebshopProduct {
  id: number;
  name: string;
  item_id: number;
  item_quantity: number;
  price_real?: number;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductsResponse {
  success: boolean;
  products: WebshopProduct[];
  total: number;
  page: number;
  pages: number;
}

// Public endpoint for all users to view products
export async function fetchProducts(options?: { search?: string; page?: number; limit?: number }): Promise<ProductsResponse> {
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
    if (data.success) return data;
    return { success: false, products: [], total: 0, page: 1, pages: 0 };
  } catch {
    console.error("Failed to fetch products");
    return { success: false, products: [], total: 0, page: 1, pages: 0 };
  }
}

// Admin-only endpoint for product management
export async function fetchProductsAdmin(options?: { search?: string; page?: number; limit?: number }): Promise<ProductsResponse> {
  try {
    const params = new URLSearchParams({ action: "list_products" });
    if (options?.search) params.append("search", options.search);
    if (options?.page) params.append("page", String(options.page));
    if (options?.limit) params.append("limit", String(options.limit));

    const res = await fetch(`${API_BASE}/webshop_admin.php?${params.toString()}`, {
      credentials: "include",
      headers: { ...getAuthHeaders(), Accept: "application/json" },
    });
    const data: ProductsResponse = await res.json();
    if (data.success) return data;
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
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function updateProduct(product: Partial<WebshopProduct> & { id: number }): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/webshop_admin.php?action=update_product`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function deleteProduct(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/webshop_admin.php?action=delete_product`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ id }),
  });
  return res.json();
}
