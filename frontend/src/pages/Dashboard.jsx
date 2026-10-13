import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { TABS } from "../config/tabs.js";
import DashboardNav from "../components/layout/DashboardNav.jsx";

// Dashboard shell: top bar + role-filtered tab nav; the active tab renders
// in the <Outlet />.
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab = TABS.find((tab) => pathname.startsWith(tab.path));

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
      <DashboardNav />
      <main>
        {activeTab && <h1>{activeTab.label}</h1>}
        <Outlet />
      </main>
    </div>
  );
}
