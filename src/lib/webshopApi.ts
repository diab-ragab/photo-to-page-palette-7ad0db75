/**
 * Webshop API client for fetching products and categories from PHP backend
 */

const API_BASE = "https://woiendgame.online/api";

export interface WebshopCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface WebshopProduct {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  description: string;
  item_id: number;
  item_quantity: number;
  price_coins: number;
  price_vip: number;
  price_zen: number;
  price_real: number;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  stock: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductsResponse {
  success: boolean;
  products: WebshopProduct[];
  total: number;
  page: number;
  pages: number;
}

export interface CategoriesResponse {
  success: boolean;
  categories: WebshopCategory[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("woi_session_token") || "";
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(token ? { "X-Session-Token": token, "Authorization": `Bearer ${token}` } : {}),
  };
}

export async function fetchCategories(): Promise<WebshopCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/webshop_admin.php?action=list_categories`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    const data: CategoriesResponse = await res.json();
    if (data.success && data.categories) {
      return data.categories;
    }
    return [];
  } catch {
    console.error("Failed to fetch categories");
    return [];
  }
}

export async function fetchProducts(options?: {
  categoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ProductsResponse> {
  try {
    const params = new URLSearchParams({ action: "list_products" });
    if (options?.categoryId) params.append("category_id", String(options.categoryId));
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

export async function addCategory(category: { name: string; slug?: string; description?: string }): Promise<{ success: boolean; id?: number; message?: string }> {
  const res = await fetch(`${API_BASE}/webshop_admin.php?action=add_category`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(category),
  });
  return res.json();
}
