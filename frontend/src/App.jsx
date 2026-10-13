import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import { useAuth } from "./auth/AuthContext.jsx";
import { TABS, defaultTabFor } from "./config/tabs.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import NotFound from "./pages/NotFound.jsx";
import LiveMonitoring from "./components/LiveMonitoring.jsx";
import ComingSoon from "./components/layout/ComingSoon.jsx";
import Spinner from "./components/Spinner.jsx";
import AnalyticsTab from "./pages/tabs/AnalyticsTab.jsx";
import ForecastTab from "./pages/tabs/ForecastTab.jsx";
import SystemTab from "./pages/tabs/SystemTab.jsx";

// Content for each dashboard tab; a tab without a page shows a placeholder.
const TAB_CONTENT = {
  live: <LiveMonitoring />,
  analytics: <AnalyticsTab />,
  forecast: <ForecastTab />,
  system: <SystemTab />,
};

// Sends "/" (and "/dashboard") to the login page or the user's default tab.
function HomeRedirect() {
  const { user, checking } = useAuth();
  if (checking) return <Spinner label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate to={defaultTabFor(user.role)?.path || "/unauthorized"} replace />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<HomeRedirect />} />
          {TABS.map((tab) => (
            <Route key={tab.key} element={<ProtectedRoute roles={tab.roles} />}>
              <Route
                path={tab.key}
                element={
                  TAB_CONTENT[tab.key] || <ComingSoon label={tab.label} />
                }
              />
            </Route>
          ))}
        </Route>
      </Route>

      {/* Old per-role dashboards (before the tab shell). */}
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="/operator" element={<Navigate to="/" replace />} />
      <Route path="/analyst" element={<Navigate to="/" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
