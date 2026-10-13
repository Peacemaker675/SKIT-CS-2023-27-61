import {
  ChartIcon,
  ClockIcon,
  LiveIcon,
  MapPinIcon,
  SettingsIcon,
} from "../../components/icons.jsx";

// SRS Tab 2 (Analytics): placeholder panels for now.
const PANELS = [
  {
    id: "analytics-query-filters",
    title: "Query Filters",
    description:
      "Filter historical data by date range, intersection, weather and events.",
    wide: true,
    Icon: SettingsIcon,
  },
  {
    id: "analytics-traffic-volume",
    title: "Traffic Volume",
    description: "Line chart of vehicle counts over time.",
    wide: false,
    Icon: LiveIcon,
  },
  {
    id: "analytics-average-wait-time",
    title: "Average Wait Time",
    description: "Bar chart of average wait time per intersection and lane.",
    wide: false,
    Icon: ClockIcon,
  },
  {
    id: "analytics-congestion-heatmap",
    title: "Congestion Heatmap",
    description: "Congestion levels by intersection and hour of day.",
    wide: false,
    Icon: MapPinIcon,
  },
  {
    id: "analytics-csv-export",
    title: "CSV Export",
    description: "Download the filtered data as a CSV file.",
    wide: false,
    Icon: ChartIcon,
  },
  {
    id: "analytics-data-table",
    title: "Data Table",
    description: "Raw historical traffic records matching the current filters.",
    wide: true,
    Icon: ChartIcon,
  },
];

export default function AnalyticsTab() {
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
