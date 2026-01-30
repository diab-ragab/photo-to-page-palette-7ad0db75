/**
 * Small helper to debug backend issues where an endpoint returns HTML / non-JSON
 * (common with PHP fatal errors, auth redirects, or misconfigured server).
 */

export type FetchJsonError = Error & {
  status?: number;
  contentType?: string | null;
  textPreview?: string;
};

export async function fetchJsonOrThrow<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const response = await fetch(input, {
    ...init,
    headers,
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
