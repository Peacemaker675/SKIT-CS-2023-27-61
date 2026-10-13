import { ROLES } from "../auth/AuthContext.jsx";

// Dashboard tabs and the roles that can see each one (from the SRS).
export const TABS = [
  {
    key: "live",
    label: "Live Monitoring",
    path: "/dashboard/live",
    roles: [ROLES.OPERATOR, ROLES.ADMIN],
  },
  {
    key: "analytics",
    label: "Analytics",
    path: "/dashboard/analytics",
    roles: [ROLES.ANALYST, ROLES.ADMIN],
  },
  {
    key: "forecast",
    label: "Forecast",
    path: "/dashboard/forecast",
    roles: [ROLES.OPERATOR, ROLES.ADMIN, ROLES.ANALYST],
  },
  {
    key: "system",
    label: "System Management",
    path: "/dashboard/system",
    roles: [ROLES.ADMIN],
  },
];

// Tab each role lands on after login.
const DEFAULT_TAB_KEY = {
  [ROLES.OPERATOR]: "live",
  [ROLES.ADMIN]: "live",
  [ROLES.ANALYST]: "analytics",
};

// Tabs the role can see (empty for unknown roles).
export function tabsFor(role) {
  return TABS.filter((tab) => tab.roles.includes(role));
}

// Landing tab for the role, or null if the role is unknown.
export function defaultTabFor(role) {
  const key = DEFAULT_TAB_KEY[role];
  return TABS.find((tab) => tab.key === key) ?? null;
}
