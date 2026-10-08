import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

// Placeholder role dashboard - real widgets come later.
export default function Dashboard({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="page">
      <header className="topbar">
        <strong>Intelliroute</strong>
        <span className="spacer" />
        <span className="muted">
          {user.username} ({user.official_id}) · {user.role}
        </span>
        <button className="secondary" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main>
        <h1>{title}</h1>
        <p className="muted">This dashboard is a placeholder.</p>
      </main>
    </div>
  );
}
