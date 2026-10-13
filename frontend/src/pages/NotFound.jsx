import { Link } from "react-router-dom";
import Brand from "../components/layout/Brand.jsx";
import { CompassIcon } from "../components/icons.jsx";

export default function NotFound() {
  return (
    <div className="center auth-bg">
      <div className="card status-card">
        <Brand />
        <span className="empty-icon">
          <CompassIcon size={26} />
        </span>
        <h1>Page not found</h1>
        <p className="muted">This page doesn&apos;t exist or has moved.</p>
        <Link className="button-link" to="/">
          Go home
        </Link>
      </div>
    </div>
  );
}
