/**
 * Unified PayPal Order Creation
 *
 * Single entry-point for every checkout flow (webshop, bundles, game pass).
 * Each flow calls `createPayPalOrder` with the appropriate `OrderPayload` variant;
 * the function returns a PayPal order ID string ready for `PayPalButtons.createOrder`.
 */

import { API_BASE, getAuthHeaders } from "@/lib/apiFetch";
import { bundlesApi } from "@/lib/bundlesApi";

// ── Payload variants ────────────────────────────────────────────────

export interface WebshopOrderPayload {
  type: "webshop";
  items: { id: string; name: string; price: number; quantity: number }[];
  characterId: number;
  characterName: string;
  isGift: boolean;
  giftCharacterName: string;
}

export interface BundleOrderPayload {
  type: "bundle";
  bundleId: number;
  characterId: number;
  characterName: string;
}

export interface GamePassOrderPayload {
  type: "gamepass";
  tier: "elite" | "gold";
  upgrade: boolean;
}

export interface GamePassExtendOrderPayload {
  type: "gamepass_extend";
  tier: "elite" | "gold";
  days: number;
}

export type OrderPayload =
  | WebshopOrderPayload
  | BundleOrderPayload
  | GamePassOrderPayload
  | GamePassExtendOrderPayload;

// ── Helpers ─────────────────────────────────────────────────────────

/** Extract PayPal token (order ID) from a PayPal redirect URL */
function extractPayPalToken(url: string): string {
  const token = new URL(url).searchParams.get("token");
  if (!token) throw new Error("Failed to obtain PayPal order ID from redirect URL");
  return token;
}

function getSessionToken(): string {
  return localStorage.getItem("woi_session_token") || localStorage.getItem("sessionToken") || "";
}

// ── Unified creator ─────────────────────────────────────────────────

/**
 * Creates a PayPal order for any checkout flow and returns the PayPal order ID.
 *
 * Usage with `CardPaymentForm`:
 * ```tsx
 * <CardPaymentForm createOrderFn={() => createPayPalOrder(payload)} … />
 * ```
 */
export async function createPayPalOrder(payload: OrderPayload): Promise<string> {
  const token = getSessionToken();

  switch (payload.type) {
    // ── Webshop (cart checkout) ──────────────────────────────────────
    case "webshop": {
      const res = await fetch(
        `${API_BASE}/paypal_create_card_order.php?sessionToken=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({
            items: payload.items.map((i) => ({
              id: i.id,
              name: i.name,
              price: Number(i.price),
              quantity: i.quantity,
            })),
            character_id: payload.isGift ? 0 : payload.characterId,
            character_name: payload.isGift ? "" : payload.characterName,
            is_gift: payload.isGift,
            gift_character_name: payload.isGift ? payload.giftCharacterName.trim() : "",
            sessionToken: token,
          }),
        }
      );

      const data = await res.json();
      if (!data.success || !data.orderID) {
        throw new Error(data.message || "Failed to create webshop order");
      }
      return data.orderID;
    }

    // ── Flash-sale bundle ───────────────────────────────────────────
    case "bundle": {
      const { url } = await bundlesApi.purchase(
        payload.bundleId,
        payload.characterId,
        payload.characterName
      );
      return extractPayPalToken(url);
    }

    // ── Game Pass ───────────────────────────────────────────────────
    case "gamepass": {
      const res = await fetch(
        `${API_BASE}/gamepass_purchase.php?sessionToken=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({
            tier: payload.tier,
            sessionToken: token,
            upgrade: payload.upgrade,
          }),
        }
      );

      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.error || data.message || "Failed to start game pass purchase");
      }
      return extractPayPalToken(data.url);
    }

    // ── Game Pass Extension ─────────────────────────────────────────
    case "gamepass_extend": {
      const res = await fetch(
        `${API_BASE}/gamepass_extend.php?sessionToken=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({
            tier: payload.tier,
            days: payload.days,
            sessionToken: token,
          }),
        }
      );

      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.error || data.message || "Failed to start pass extension");
      }
      return extractPayPalToken(data.url);
    }
  }
}
