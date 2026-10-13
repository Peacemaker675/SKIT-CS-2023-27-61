import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { tabsFor } from "../../config/tabs.js";
import { ChartIcon, ForecastIcon, LiveIcon, SettingsIcon } from "../icons.jsx";

const TAB_ICONS = {
  live: LiveIcon,
  analytics: ChartIcon,
  forecast: ForecastIcon,
  system: SettingsIcon,
};

// Tab bar under the top bar; only shows tabs the user's role may open.
export default function DashboardNav() {
  const { user } = useAuth();

  return (
    <nav className="tabnav" aria-label="Dashboard sections">
      {tabsFor(user.role).map((tab) => {
        const TabIcon = TAB_ICONS[tab.key];
        return (
          <NavLink key={tab.key} to={tab.path}>
            {TabIcon && <TabIcon size={16} />}
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
