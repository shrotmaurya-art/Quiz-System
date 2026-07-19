const apiBaseUrl = import.meta.env.VITE_API_URL || '';

let adminToken = null;
let unauthorizedHandler = null;

export function setAdminToken(token) {
  adminToken = token;
}

export function clearAdminToken() {
  adminToken = null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/**
 * Fetches an API endpoint, attaching the in-memory admin session token when present.
 * A 401 from an authenticated request clears the session through the registered handler.
 */
export async function apiFetch(path, { skipAuth = false, skipUnauthorized = false, headers, ...options } = {}) {
  const isFormData = options.body instanceof FormData;
  const requestHeaders = isFormData ? {} : new Headers(headers);

  if (!skipAuth && adminToken) {
    if (isFormData) {
      requestHeaders['Authorization'] = `Bearer ${adminToken}`;
    } else {
      requestHeaders.set('Authorization', `Bearer ${adminToken}`);
    }
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: requestHeaders,
  });

  if (response.status === 401 && !skipUnauthorized) {
    clearAdminToken();
    unauthorizedHandler?.();
  }

  return response;
}
