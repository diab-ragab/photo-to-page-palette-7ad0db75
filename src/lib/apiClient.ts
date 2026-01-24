/**
 * Centralized API client with session-based authentication and CSRF protection
 */

const API_BASE_URL = 'https://woiendgame.online/api';

// CSRF Token storage (in-memory for security)
let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

export const getCsrfToken = (): string | null => {
  return csrfToken;
};

export const clearCsrfToken = () => {
  csrfToken = null;
};

interface FetchOptions extends Omit<RequestInit, 'credentials'> {
  includeAuth?: boolean;
  includeCsrf?: boolean;
}

/**
 * Make an authenticated API request with session credentials and CSRF token
 */
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  const { includeAuth = true, includeCsrf = true, headers = {}, ...rest } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const requestHeaders: HeadersInit = {
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Add CSRF token for state-changing requests
  if (includeCsrf && csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes((rest.method || 'GET').toUpperCase())) {
    (requestHeaders as Record<string, string>)['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    credentials: includeAuth ? 'include' : 'omit',
  });

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
  }

  return response.json();
};

/**
 * GET request helper
 */
export const apiGet = <T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
};

/**
 * POST request helper with JSON body
 */
export const apiPost = <T = unknown>(
  endpoint: string,
  body?: unknown,
  options: FetchOptions = {}
): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * POST request with FormData (for file uploads or legacy endpoints)
 */
export const apiPostForm = async <T = unknown>(
  endpoint: string,
  formData: FormData,
  options: FetchOptions = {}
): Promise<T> => {
  const { includeAuth = true, includeCsrf = true, headers = {}, ...rest } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const requestHeaders: HeadersInit = {
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Add CSRF token
  if (includeCsrf && csrfToken) {
    (requestHeaders as Record<string, string>)['X-CSRF-Token'] = csrfToken;
  }

  // Don't set Content-Type for FormData - browser will set it with boundary
  const response = await fetch(url, {
    ...rest,
    method: 'POST',
    headers: requestHeaders,
    credentials: includeAuth ? 'include' : 'omit',
    body: formData,
  });

  return response.json();
};

/**
 * DELETE request helper
 */
export const apiDelete = <T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
};

/**
 * PUT request helper
 */
export const apiPut = <T = unknown>(
  endpoint: string,
  body?: unknown,
  options: FetchOptions = {}
): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
};

export { API_BASE_URL };
