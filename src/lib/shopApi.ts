/**
 * New Shop API client
 * Fetch wrappers for the new /api/shop_* endpoints
 */

import { API_BASE, getAuthHeaders } from './apiFetch';

export interface ShopProduct {
  id: number;
  sku: string;
  name: string;
  description: string;
  type: 'zen' | 'coins' | 'exp' | 'item' | 'bundle';
  price_cents: number;
  currency: string;
  payload_json: string;
  image_url: string;
}

export interface ShopProductsResponse {
  success: boolean;
  products: ShopProduct[];
  total: number;
  page: number;
  pages: number;
}

export interface CreateOrderResponse {
  success: boolean;
  order_id: number;
  paypalOrderId: string;
  approveUrl: string;
  rid: string;
  error?: string;
}

export interface CaptureOrderResponse {
  success: boolean;
  status: string;
  order_id: number;
  processed_count: number;
  failed_count?: number;
  already_captured?: boolean;
  deliveries: Array<{
    item_type: string;
    item_ref: string;
    qty: number;
    result: string;
    message: string;
  }>;
  rid: string;
  error?: string;
}

export interface OrderStatusResponse {
  success: boolean;
  order: {
    id: number;
    status: string;
    account_name: string;
    character_name: string;
    total_cents: number;
    currency: string;
    paypal_order_id: string;
    created_at: string;
  };
  items: Array<{
    product_id: number;
    name: string;
    type: string;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
  deliveries: Array<{
    item_type: string;
    item_ref: string;
    qty: number;
    result: string;
    message: string;
    created_at: string;
  }>;
  rid: string;
}

export interface UserCharacter {
  roleId: number;
  name: string;
  level: number;
  profession: string;
  professionId: number;
  sex: number;
}

/** Fetch user's in-game characters */
export async function fetchUserCharacters(): Promise<UserCharacter[]> {
  const res = await fetch(`${API_BASE}/user_characters.php`, {
    credentials: 'include',
    headers: { ...getAuthHeaders() },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load characters');
  return data.characters || [];
}

/** Fetch active products (public, no auth) */
export async function fetchShopProducts(opts?: { search?: string; page?: number; limit?: number }): Promise<ShopProductsResponse> {
  const params = new URLSearchParams();
  if (opts?.search) params.append('search', opts.search);
  if (opts?.page) params.append('page', String(opts.page));
  if (opts?.limit) params.append('limit', String(opts.limit));

  const res = await fetch(`${API_BASE}/shop_products.php?${params.toString()}`, {
    credentials: 'omit',
  });
  return res.json();
}

/** Create order + PayPal order */
export async function createShopOrder(data: {
  cart: Array<{ product_id: number; qty: number }>;
  account_name: string;
  character_name: string;
}): Promise<CreateOrderResponse> {
  const token = localStorage.getItem('woi_session_token') || localStorage.getItem('sessionToken') || '';
  const res = await fetch(`${API_BASE}/shop_create_order.php?sessionToken=${encodeURIComponent(token)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

/** Capture PayPal order after approval */
export async function captureShopOrder(paypalOrderId: string): Promise<CaptureOrderResponse> {
  const token = localStorage.getItem('woi_session_token') || localStorage.getItem('sessionToken') || '';
  const res = await fetch(`${API_BASE}/shop_capture_order.php?sessionToken=${encodeURIComponent(token)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ paypalOrderId }),
  });
  return res.json();
}

/** Get order status */
export async function getShopOrderStatus(orderId: number): Promise<OrderStatusResponse> {
  const res = await fetch(`${API_BASE}/shop_order_status.php?order_id=${orderId}`, {
    credentials: 'omit',
  });
  return res.json();
}
