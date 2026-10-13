import { ROLES } from "../auth/AuthContext.jsx";

// Dashboard tabs and which roles may see each one (per the SRS).
// Paths point at /dashboard/<key>; the routes themselves are wired up separately.
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

// Tabs visible to the given role (empty array for unknown roles).
export function tabsFor(role) {
  return TABS.filter((tab) => tab.roles.includes(role));
}

// Default tab object for the given role, or null for unknown/empty roles.
export function defaultTabFor(role) {
  const key = DEFAULT_TAB_KEY[role];
  return TABS.find((tab) => tab.key === key) ?? null;
}
