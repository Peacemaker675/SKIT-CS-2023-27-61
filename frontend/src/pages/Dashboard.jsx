import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { TABS } from "../config/tabs.js";
import Brand from "../components/layout/Brand.jsx";
import DashboardNav from "../components/layout/DashboardNav.jsx";
import ThemeToggle from "../components/layout/ThemeToggle.jsx";
import { LogoutIcon } from "../components/icons.jsx";

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
        <Brand />
        <span className="spacer" />
        <ThemeToggle />
        <div
          className="user-chip"
          title={`${user.username} (${user.official_id})`}
        >
          <span className="avatar" aria-hidden="true">
            {(user.username || "?").charAt(0).toUpperCase()}
          </span>
          <span className="user-meta">
            <span className="user-name">{user.username}</span>
            <span className="user-id">{user.official_id}</span>
          </span>
          <span className={`role-badge role-${user.role}`}>{user.role}</span>
        </div>
        <button
          type="button"
          className="secondary logout-button"
          onClick={handleLogout}
          aria-label="Log out"
        >
          <LogoutIcon size={16} />
          <span className="hide-sm">Log out</span>
        </button>
      </header>
      <DashboardNav />
      <main>
        {activeTab && <h1 className="page-title">{activeTab.label}</h1>}
        <Outlet />
      </main>
    </div>
  );
}
