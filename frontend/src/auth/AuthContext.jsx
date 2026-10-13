import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi, setUnauthorizedHandler } from "../api/client.js";

// The JWT itself lives in HttpOnly cookies set by the backend. localStorage
// only caches who is logged in (role, username, official_id) so the UI can
// route without a round trip; the backend remains the source of truth.
const STORAGE_KEY = "intelliroute.auth";

// Landing tab per role is in config/tabs.js (defaultTabFor).
export const ROLES = {
  ADMIN: "admin",
  OPERATOR: "operator",
  ANALYST: "analyst",
};

// Backend stores roles lowercased; normalise anything we receive.
const normaliseRole = (role) => (role || "").toString().trim().toLowerCase();

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(user) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode etc.) - in-memory state still works
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  // While true we are confirming the cached user with GET /auth/check.
  const [checking, setChecking] = useState(() => readStoredUser() !== null);

  const clearSession = useCallback(() => {
    storeUser(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  // On first load, verify the cookie session still matches the cached user.
  useEffect(() => {
    if (!readStoredUser()) return;
    let cancelled = false;
    authApi
      .check()
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (officialId, password) => {
    const data = await authApi.login(officialId, password);
    const nextUser = {
      role: normaliseRole(data.role),
      username: data.username,
      official_id: data.official_id,
    };
    storeUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // cookies may already be gone; clear local state regardless
    }
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
