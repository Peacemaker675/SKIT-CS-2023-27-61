import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ROLE_HOME, useAuth } from "../auth/AuthContext.jsx";
import { ApiError } from "../api/client.js";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [officialId, setOfficialId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={ROLE_HOME[user.role] || "/unauthorized"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!officialId.trim() || !password.trim()) {
      setError("Official ID and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(officialId, password);
      const home = ROLE_HOME[loggedIn.role] || "/unauthorized";
      // Return to the page that bounced us here, if the role can see it.
      const from = location.state?.from?.pathname;
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid official ID or password.");
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
    <div className="center">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <h1>Intelliroute</h1>
        <p className="muted">Sign in to continue</p>

        <label htmlFor="official_id">Official ID</label>
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
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
