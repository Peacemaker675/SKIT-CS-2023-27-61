// Thin fetch wrapper for the Flask API.
// The backend keeps the JWTs in HttpOnly cookies, so every request must send
// credentials; JS never sees the token itself.

import mockIntersections from "../mocks/intersections.json";
import { mockEmergencies } from "../mocks/emergencies.js";

export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export class ApiError extends Error {
  constructor(status, body) {
    super(
      (body && (body.code || body.msg || body.error || body.message)) ||
        `HTTP ${status}`,
    );
    this.status = status;
    this.body = body;
    this.code = (body && (body.code || body.msg)) || null;
  }
}

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function rawRequest(path, { method = "GET", body } = {}) {
  const headers = body !== undefined ? { "Content-Type": "application/json" } : {};
  const upperMethod = method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod)) {
    const isRefresh = path.includes("/auth/refresh");
    const csrfToken = isRefresh
      ? getCookie("csrf_refresh_token") || getCookie("csrf_access_token")
      : getCookie("csrf_access_token");
    if (csrfToken) {
      headers["X-CSRF-TOKEN"] = csrfToken;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers,
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

// The backend has no override route yet (or this intersection has none).
export class OverrideUnavailable extends Error {}

export const authApi = {
  login: (official_id, password) =>
    rawRequest("/auth/login", {
      method: "POST",
      body: { official_id, password },
    }),
  check: () => apiRequest("/auth/check"),
  logout: () => rawRequest("/auth/logout", { method: "POST" }),
};

// Each intersection: { id, name, lat, lng, neighbors: [id, ...] } (SRS: unique
// ID, GPS coordinates and adjacent neighbours).
export const intersectionsApi = {
  // The SRS lists GET /api/admin/intersections but the backend doesn't serve
  // it yet; use placeholder intersections only while the route is missing.
  list: async () => {
    try {
      const data = await apiRequest("/admin/intersections");
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return mockIntersections;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return mockIntersections;
      }
      throw err;
    }
  },
  // Latest known state per intersection, so a panel can render instantly
  // instead of waiting for the next socket push. Returns { [id]: data }.
  // ASSUMPTION: the backend has no such route yet. The path below
  // (GET /api/intersections/latest?ids=a,b) follows the intersections
  // blueprint prefix and must be confirmed with the backend owner.
  latest: async (ids = []) => {
    const query = encodeURIComponent(ids.join(","));
    try {
      return (await apiRequest(`/intersections/latest?ids=${query}`)) || {};
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return {};
      }
      throw err;
    }
  },
};

// True when the backend doesn't serve the route at all: Flask's default 404
// page is HTML, so there is no JSON error code. A 404 *with* a code (e.g.
// EMERGENCY_NOT_FOUND) is a real answer and must not fall back to the mock.
function routeMissing(err) {
  return err instanceof ApiError && err.status === 404 && !err.code;
}

// Call the API; if the route doesn't exist yet, run the mock instead and
// turn its errors into ApiErrors so callers handle both the same way.
async function withMockFallback(request, mock) {
  try {
    return await request();
  } catch (err) {
    if (!routeMissing(err)) throw err;
  }
  try {
    return mock();
  } catch (err) {
    throw new ApiError(err.status || 400, { code: err.code || err.message });
  }
}

// Emergency green corridor (shared/schemas/emergency.schema.json). All three
// endpoints are proposed, not in the SRS; until the backend has them the
// in-memory mocks/emergencies.js answers instead.
export const emergenciesApi = {
  // body: { vehicle_type, start_id, end_id } -> the new emergency.
  start: (body) =>
    withMockFallback(
      () => apiRequest("/emergencies", { method: "POST", body }),
      () => mockEmergencies.start(body),
    ),
  // Active emergencies, oldest first.
  list: () =>
    withMockFallback(
      () => apiRequest("/emergencies/active"),
      () => mockEmergencies.list(),
    ),
  // Mark an emergency as cleared -> the updated emergency.
  clear: (id) =>
    withMockFallback(
      () =>
        apiRequest(`/emergencies/${encodeURIComponent(id)}/clear`, {
          method: "POST",
        }),
      () => mockEmergencies.clear(id),
    ),
  // Stop an emergency early (operator decision) -> the updated emergency.
  cancel: (id) =>
    withMockFallback(
      () =>
        apiRequest(`/emergencies/${encodeURIComponent(id)}/cancel`, {
          method: "POST",
        }),
      () => mockEmergencies.cancel(id),
    ),
};

// SRS manual override. ASSUMPTION: the body is { action } until the backend
// route exists (Dependencies V6).
export const overrideApi = {
  send: async (id, action) => {
    try {
      await apiRequest(`/intersections/${encodeURIComponent(id)}/override`, {
        method: "POST",
        body: { action },
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        throw new OverrideUnavailable();
      }
      throw err;
    }
  },
};
