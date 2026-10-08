import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="center">
      <div className="card">
        <h1>Page not found</h1>
        <Link to="/">Go home</Link>
      </div>
    </div>
  );
}
