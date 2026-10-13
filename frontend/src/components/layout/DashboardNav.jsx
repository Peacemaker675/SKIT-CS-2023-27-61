import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { tabsFor } from "../../config/tabs.js";

// Tab bar under the top bar; only shows tabs the user's role may open.
export default function DashboardNav() {
  const { user } = useAuth();

  return (
    <nav className="tabnav" aria-label="Dashboard sections">
      {tabsFor(user.role).map((tab) => (
        <NavLink key={tab.key} to={tab.path}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
