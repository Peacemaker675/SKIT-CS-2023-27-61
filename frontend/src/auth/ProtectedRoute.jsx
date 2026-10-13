import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";

// Guards child routes: requires a logged-in user and, optionally, one of
// `roles`. Note this is UX only - the backend enforces access on every call.
export default function ProtectedRoute({ roles }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return <Spinner label="Checking session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
