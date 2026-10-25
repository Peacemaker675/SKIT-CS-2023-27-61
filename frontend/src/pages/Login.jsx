import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { defaultTabFor, tabsFor } from "../config/tabs.js";
import { ApiError } from "../api/client.js";
import Brand from "../components/layout/Brand.jsx";
import ThemeToggle from "../components/layout/ThemeToggle.jsx";
import LanguageToggle from "../components/layout/LanguageToggle.jsx";
import { useT } from "../i18n/i18n.js";
import { EyeIcon, EyeOffIcon } from "../components/icons.jsx";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();

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
      setError(t("login.required"));
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(officialId, password);
      const home = defaultTabFor(loggedIn.role)?.path || "/unauthorized";
      // Go back to the page that sent us here, if this role can open it.
      const from = location.state?.from?.pathname;
      const canSee =
        from && tabsFor(loggedIn.role).some((tab) => from.startsWith(tab.path));
      navigate(canSee ? from : home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("login.invalid"));
      } else if (err instanceof ApiError) {
        setError(t("login.failed", { status: err.status }));
      } else {
        setError(t("login.offline"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="center auth-bg">
      <div className="auth-corner">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-header">
          <Brand size={48} className="brand-lg" />
          <p className="muted">{t("login.tagline")}</p>
        </div>

        <h1 className="auth-title">{t("login.title")}</h1>

        {/* Labelled "Username", but the backend logs in by official ID. */}
        <label htmlFor="official_id">{t("login.username")}</label>
        <input
          id="official_id"
          name="official_id"
          autoComplete="username"
          value={officialId}
          onChange={(e) => setOfficialId(e.target.value)}
          disabled={submitting}
          autoFocus
        />

        <label htmlFor="password">{t("login.password")}</label>
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
            aria-label={t(
              showPassword ? "login.hidePassword" : "login.showPassword",
            )}
            title={t(
              showPassword ? "login.hidePassword" : "login.showPassword",
            )}
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
          {submitting ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}
