/**
 * Small helper to debug backend issues where an endpoint returns HTML / non-JSON
 * (common with PHP fatal errors, auth redirects, or misconfigured server).
 */

export type FetchJsonError = Error & {
  status?: number;
  contentType?: string | null;
  textPreview?: string;
};

/**
 * Get auth headers for authenticated requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('sessionToken');
  if (!token) return {};
  return {
    'Authorization': `Bearer ${token}`,
    'X-Session-Token': token,
  };
}

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
  
  // Include auth headers by default
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
    // Prevent silent POST->GET redirects that then return HTML.
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
