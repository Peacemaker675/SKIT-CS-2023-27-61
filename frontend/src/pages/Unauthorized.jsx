import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Brand from "../components/layout/Brand.jsx";
import { LockIcon } from "../components/icons.jsx";
import { useT } from "../i18n/i18n.js";

export default function Unauthorized() {
  const { user, logout } = useAuth();
  const { t } = useT();

  return (
    <div className="center auth-bg">
      <div className="card status-card">
        <Brand />
        <span className="empty-icon">
          <LockIcon size={26} />
        </span>
        <h1>{t("unauthorized.title")}</h1>
        <p className="muted">
          {user
            ? t("unauthorized.roleText", { role: t(`roles.${user.role}`) })
            : t("unauthorized.signInText")}
        </p>
        {user ? (
          <div className="actions">
            <Link className="button-link" to="/">
              {t("unauthorized.dashboard")}
            </Link>
            <button type="button" className="secondary" onClick={logout}>
              {t("common.logout")}
            </button>
          </div>
        ) : (
          <Link className="button-link" to="/login">
            {t("unauthorized.login")}
          </Link>
        )}
      </div>
    </div>
  );
}
