import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Unauthorized() {
  const { user, logout } = useAuth();

  return (
    <div className="center">
      <div className="card">
        <h1>Access denied</h1>
        <p className="muted">
          {user
            ? `Your role "${user.role}" does not have access to this page.`
            : "You need to sign in to view this page."}
        </p>
        {user ? (
          <>
            <Link to="/">Go to my dashboard</Link>
            <button className="secondary" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <Link to="/login">Go to login</Link>
        )}
      </div>
    </div>
  );
}
