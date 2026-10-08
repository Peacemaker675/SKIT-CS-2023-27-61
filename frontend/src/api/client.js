// Thin fetch wrapper for the Flask API.
// The backend keeps the JWTs in HttpOnly cookies, so every request must send
// credentials; JS never sees the token itself.

export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export class ApiError extends Error {
  constructor(status, body) {
    super((body && (body.msg || body.error)) || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function rawRequest(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON or empty body
  }

  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// Called when the session can't be recovered (refresh token missing/expired).
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function refreshSession() {
  await rawRequest("/auth/refresh", { method: "POST" });
}

// Authenticated request: on 401, try the refresh endpoint once, then retry.
export async function apiRequest(path, options) {
  try {
    return await rawRequest(path, options);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
  }

  try {
    await refreshSession();
  } catch (err) {
    onUnauthorized();
    throw err;
  }
  return rawRequest(path, options);
}

export const authApi = {
  login: (official_id, password) =>
    rawRequest("/auth/login", {
      method: "POST",
      body: { official_id, password },
    }),
  check: () => apiRequest("/auth/check"),
  logout: () => rawRequest("/auth/logout", { method: "POST" }),
};
