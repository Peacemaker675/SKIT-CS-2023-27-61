import { CompassIcon, ForecastIcon } from "../../components/icons.jsx";

// SRS Tab 3 (Forecast): placeholder panels for now.
const PANELS = [
  {
    id: "forecast-predictive-map",
    title: "Predictive Map",
    description:
      "Map of predicted congestion with a time slider for the forecast horizon.",
    wide: true,
    Icon: CompassIcon,
  },
  {
    id: "forecast-predictive-insights",
    title: "Predictive Insights",
    description: "Upcoming congestion warnings and suggested actions.",
    wide: false,
    Icon: ForecastIcon,
  },
];

export default function ForecastTab() {
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
