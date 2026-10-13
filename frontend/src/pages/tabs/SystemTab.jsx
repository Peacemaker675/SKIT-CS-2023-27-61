import { LockIcon, MapPinIcon, LiveIcon } from "../../components/icons.jsx";

// SRS Tab 4 (System Management, admin only): placeholder panels for now.
const PANELS = [
  {
    id: "system-user-management",
    title: "User Management",
    description:
      "Add, edit and deactivate operator, analyst and admin accounts.",
    wide: false,
    Icon: LockIcon,
  },
  {
    id: "system-intersection-config",
    title: "Intersection Configuration",
    description:
      "Register intersections with their ID, GPS coordinates and neighbouring intersections.",
    wide: false,
    Icon: MapPinIcon,
  },
  {
    id: "system-health-monitor",
    title: "System Health Monitor",
    description:
      "Status of the API, Redis, InfluxDB, PostgreSQL and the RL agents.",
    wide: true,
    Icon: LiveIcon,
  },
];

export default function SystemTab() {
  return (
    <div className="tab-grid">
      {PANELS.map(({ id, title, description, wide, Icon }) => (
        <section
          key={id}
          className={wide ? "section-panel wide" : "section-panel"}
          aria-labelledby={id}
        >
          <header>
            <span className="section-icon">
              <Icon size={18} />
            </span>
            <h2 id={id}>{title}</h2>
            <span className="soon-chip">Coming soon</span>
          </header>
          <p className="muted">{description}</p>
        </section>
      ))}
    </div>
  );
}
