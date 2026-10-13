import { ClockIcon } from "../icons.jsx";

// Placeholder card for dashboard tabs that aren't built yet.
export default function ComingSoon({ label }) {
  return (
    <section className="empty-card">
      <span className="empty-icon">
        <ClockIcon size={26} />
      </span>
      <h2>{label} is on the way</h2>
      <p className="muted">
        This section is being built. Check back soon for the full view.
      </p>
    </section>
  );
}
