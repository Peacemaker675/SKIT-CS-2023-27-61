import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Brand from "../components/layout/Brand.jsx";
import { LockIcon } from "../components/icons.jsx";

export default function Unauthorized() {
  const { user, logout } = useAuth();

  return (
    <div className="center auth-bg">
      <div className="card status-card">
        <Brand />
        <span className="empty-icon">
          <LockIcon size={26} />
        </span>
        <h1>Access denied</h1>
        <p className="muted">
          {user
            ? `Your role "${user.role}" does not have access to this page.`
            : "You need to sign in to view this page."}
        </p>
        {user ? (
          <div className="actions">
            <Link className="button-link" to="/">
              Go to my dashboard
            </Link>
            <button type="button" className="secondary" onClick={logout}>
              Log out
            </button>
          </div>
        ) : (
          <Link className="button-link" to="/login">
            Go to login
          </Link>
        )}
      </div>
    </div>
  );
}
