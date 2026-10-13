import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { defaultTabFor, tabsFor } from "../config/tabs.js";
import { ApiError } from "../api/client.js";
import Brand from "../components/layout/Brand.jsx";
import ThemeToggle from "../components/layout/ThemeToggle.jsx";
import { EyeIcon, EyeOffIcon } from "../components/icons.jsx";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [officialId, setOfficialId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return (
      <Navigate
        to={defaultTabFor(user.role)?.path || "/unauthorized"}
        replace
      />
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!officialId.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(officialId, password);
      const home = defaultTabFor(loggedIn.role)?.path || "/unauthorized";
      // Return to the page that bounced us here, if the role can see it.
      const from = location.state?.from?.pathname;
      const canSee =
        from && tabsFor(loggedIn.role).some((tab) => from.startsWith(tab.path));
      navigate(canSee ? from : home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid username or password.");
      } else if (err instanceof ApiError) {
        setError(`Login failed (${err.status}). Please try again.`);
      } else {
        setError("Cannot reach the server. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="center auth-bg">
      <div className="auth-corner">
        <ThemeToggle />
      </div>
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-header">
          <Brand size={48} className="brand-lg" />
          <p className="muted">AI-powered traffic signal control</p>
        </div>

        <h1 className="auth-title">Sign in to continue</h1>

        {/* Labelled "Username", but the backend logs in by official ID. */}
        <label htmlFor="official_id">Username</label>
        <input
          id="official_id"
          name="official_id"
          autoComplete="username"
          value={officialId}
          onChange={(e) => setOfficialId(e.target.value)}
          disabled={submitting}
          autoFocus
        />

        <label htmlFor="password">Password</label>
        <div className="password-field">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary-gradient"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
