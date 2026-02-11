/**
 * Unified API Client
 * 
 * Single source of truth for:
 * - API base URL
 * - Auth headers (session token, CSRF)
 * - JSON fetch with error handling, retry logic, and auto toast
 * - Convenience methods (apiGet, apiPost)
 */

import { toast } from "@/hooks/use-toast";

/** Base URL for all API calls — change this one place to update everywhere */
export const API_BASE = 'https://woiendgame.online/api';

export type FetchJsonError = Error & {
  status?: number;
  contentType?: string | null;
  textPreview?: string;
  /** Parsed JSON body when server returned JSON on a non-2xx status */
  serverJson?: any;
  /** Convenience: serverJson.message when available */
  serverMessage?: string;
  /** Convenience: serverJson.rid when available */
  rid?: string;
};

/** Options for retry and toast behavior */
export interface ApiFetchOptions {
  /** Number of retries on network/5xx errors (default: 2) */
  retries?: number;
  /** Base delay in ms between retries, doubled each attempt (default: 1000) */
  retryDelay?: number;
  /** Show toast on error automatically (default: true) */
  showErrorToast?: boolean;
  /** Custom error message for toast */
  errorMessage?: string;
  /** Suppress toast for specific status codes */
  silentStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<ApiFetchOptions> = {
  retries: 2,
  retryDelay: 1000,
  showErrorToast: true,
  errorMessage: '',
  silentStatuses: [],
};

/**
 * Get auth headers for authenticated requests.
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

/** Human-readable error message from status code */
function getErrorMessage(status?: number): string {
  if (!status) return "Connection error – check your internet.";
  if (status === 401) return "Session expired – please log in again.";
  if (status === 403) return "You don't have permission for this action.";
  if (status === 404) return "Resource not found.";
  if (status === 429) return "Too many requests – try again shortly.";
  if (status >= 500) return "Server error – we're on it.";
  return `Request failed (${status}).`;
}

/** Whether a failed request should be retried */
function isRetryable(status?: number): boolean {
  if (!status) return true; // network error
  return status >= 500 || status === 429;
}

/** Sleep helper */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Core fetch wrapper with auth, JSON validation, retry, and auto-toast.
 */
export async function fetchJsonOrThrow<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  includeAuth = true,
  opts?: ApiFetchOptions,
): Promise<T> {
  const { retries, retryDelay, showErrorToast, errorMessage, silentStatuses } = {
    ...DEFAULT_OPTIONS,
    ...opts,
  };

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

  const requestInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
    redirect: "follow",
  };

  let lastError: FetchJsonError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, requestInit);
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const err: FetchJsonError = new Error(
          `HTTP ${response.status} from ${typeof input === "string" ? input : "[request]"}`
        );
        err.status = response.status;
        err.contentType = contentType;
        err.textPreview = text.slice(0, 800);

        // If server returned JSON even on an error status, parse it so UI can show the real message.
        if (contentType?.includes("application/json") && text) {
          try {
            const parsed = JSON.parse(text);
            err.serverJson = parsed;
            if (parsed && typeof parsed.message === 'string' && parsed.message.trim() !== '') {
              err.serverMessage = parsed.message;
              // Prefer the server-provided message for this error instance
              err.message = parsed.message;
            }
            if (parsed && typeof parsed.rid === 'string' && parsed.rid.trim() !== '') {
              err.rid = parsed.rid;
            }
          } catch (_e) {
            // ignore JSON parse failures, keep textPreview
          }
        }

        // Retry on 5xx/429, otherwise throw immediately
        if (isRetryable(response.status) && attempt < retries) {
          lastError = err;
          console.warn(`[API] Retry ${attempt + 1}/${retries} for ${typeof input === "string" ? input : "request"}`);
          await sleep(retryDelay * Math.pow(2, attempt));
          continue;
        }

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

    } catch (err: unknown) {
      const fetchErr = err as FetchJsonError;

      // Network errors (no status) are retryable
      if (!fetchErr.status && attempt < retries) {
        lastError = fetchErr;
        console.warn(`[API] Network retry ${attempt + 1}/${retries}`);
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }

      // Final failure – show toast if enabled
      const finalErr = fetchErr.status ? fetchErr : (lastError || fetchErr);

      if (showErrorToast && !silentStatuses.includes(finalErr.status || 0)) {
        toast({
          title: errorMessage || getErrorMessage(finalErr.status),
          description: finalErr.status === 401
            ? "Please refresh or log in again."
            : `Error ${finalErr.status || "network"} – retried ${attempt} time(s).`,
          variant: "destructive",
        });
      }

      throw finalErr;
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error("Unknown API error");
}

/**
 * Convenience: GET request to an API endpoint.
 * @param path - Relative path after API_BASE, e.g. "/events.php?action=list"
 */
export async function apiGet<T>(path: string, includeAuth = true, opts?: ApiFetchOptions): Promise<T> {
  return fetchJsonOrThrow<T>(`${API_BASE}${path}`, undefined, includeAuth, opts);
}

/**
 * Convenience: POST request to an API endpoint.
 * @param path - Relative path after API_BASE
 * @param body - JSON-serializable body
 */
export async function apiPost<T>(path: string, body?: unknown, includeAuth = true, opts?: ApiFetchOptions): Promise<T> {
  return fetchJsonOrThrow<T>(
    `${API_BASE}${path}`,
    {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    },
    includeAuth,
    opts,
  );
}
