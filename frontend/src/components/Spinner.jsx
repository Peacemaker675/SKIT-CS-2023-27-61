// Full-page loader, e.g. while the session is being checked.
export default function Spinner({ label = "Loading…" }) {
  return (
    <div className="center" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{label}</span>
    </div>
  );
}
