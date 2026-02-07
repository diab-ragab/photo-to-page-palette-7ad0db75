/**
 * Unified API Client
 * 
 * Single source of truth for:
 * - API base URL
 * - Auth headers (session token, CSRF)
 * - JSON fetch with error handling
 * - Convenience methods (apiGet, apiPost)
 */

/** Base URL for all API calls — change this one place to update everywhere */
export const API_BASE = 'https://woiendgame.online/api';

export type FetchJsonError = Error & {
  status?: number;
  contentType?: string | null;
  textPreview?: string;
};

/**
 * Get auth headers for authenticated requests.
 * Reads woi_session_token and woi_csrf_token from localStorage.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('woi_session_token') || localStorage.getItem('sessionToken');
  const csrfToken = localStorage.getItem('woi_csrf_token') || localStorage.getItem('csrfToken');

  if (!token) return {};

  return {
    'Authorization': `Bearer ${token}`,
    'X-Session-Token': token,
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  };
}

/**
 * Core fetch wrapper with auth, JSON validation, and error diagnostics.
 */
export async function fetchJsonOrThrow<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  includeAuth = true
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (includeAuth) {
    const authHeaders = getAuthHeaders();
    Object.entries(authHeaders).forEach(([key, value]) => {
      if (!headers.has(key)) headers.set(key, value);
    });
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
    redirect: "error",
  });

  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err: FetchJsonError = new Error(
      `HTTP ${response.status} from ${typeof input === "string" ? input : "[request]"}`
    );
    err.status = response.status;
    err.contentType = contentType;
    err.textPreview = text.slice(0, 800);
    throw err;
  }

  if (!contentType?.includes("application/json")) {
    const text = await response.text().catch(() => "");
    const err: FetchJsonError = new Error(
      `Non-JSON response (${contentType ?? "unknown"}) from ${typeof input === "string" ? input : "[request]"}`
    );
    err.status = response.status;
    err.contentType = contentType;
    err.textPreview = text.slice(0, 800);
    throw err;
  }

  return (await response.json()) as T;
}

/**
 * Convenience: GET request to an API endpoint.
 * @param path - Relative path after API_BASE, e.g. "/events.php?action=list"
 */
export async function apiGet<T>(path: string, includeAuth = true): Promise<T> {
  return fetchJsonOrThrow<T>(`${API_BASE}${path}`, undefined, includeAuth);
}

/**
 * Convenience: POST request to an API endpoint.
 * @param path - Relative path after API_BASE
 * @param body - JSON-serializable body
 */
export async function apiPost<T>(path: string, body?: unknown, includeAuth = true): Promise<T> {
  return fetchJsonOrThrow<T>(
    `${API_BASE}${path}`,
    {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    },
    includeAuth
  );
}
