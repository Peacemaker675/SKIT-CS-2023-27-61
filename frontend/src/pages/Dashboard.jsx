import { useNavigate } from "react-router-dom";
import { ROLES, useAuth } from "../auth/AuthContext.jsx";
import LiveMonitoring from "../components/LiveMonitoring.jsx";

// SRS: Live Monitoring is visible to Operators and Admins.
const LIVE_MONITORING_ROLES = [ROLES.OPERATOR, ROLES.ADMIN];

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
        {LIVE_MONITORING_ROLES.includes(user.role) ? (
          <LiveMonitoring />
        ) : (
          <p className="muted">This dashboard is a placeholder.</p>
        )}
      </main>
    </div>
  );
}
