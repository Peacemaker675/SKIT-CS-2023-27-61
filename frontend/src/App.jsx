import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import { ROLES, ROLE_HOME, useAuth } from "./auth/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import NotFound from "./pages/NotFound.jsx";

// Sends "/" to the login page or the current user's role dashboard.
function HomeRedirect() {
  const { user, checking } = useAuth();
  if (checking) return <div className="center muted">Checking session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || "/unauthorized"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
        <Route path="/admin" element={<Dashboard title="Admin Dashboard" />} />
      </Route>
      <Route element={<ProtectedRoute roles={[ROLES.OPERATOR]} />}>
        <Route
          path="/operator"
          element={<Dashboard title="Operator Dashboard" />}
        />
      </Route>
      <Route element={<ProtectedRoute roles={[ROLES.ANALYST]} />}>
        <Route
          path="/analyst"
          element={<Dashboard title="Analyst Dashboard" />}
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
