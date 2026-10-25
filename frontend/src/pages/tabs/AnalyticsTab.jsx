import {
  ChartIcon,
  ClockIcon,
  LiveIcon,
  MapPinIcon,
  SettingsIcon,
} from "../../components/icons.jsx";
import { useT } from "../../i18n/i18n.js";

// SRS Tab 2 (Analytics): placeholder panels for now.
const PANELS = [
  {
    id: "analytics-query-filters",
    key: "panels.analytics.filters",
    wide: true,
    Icon: SettingsIcon,
  },
  {
    id: "analytics-traffic-volume",
    key: "panels.analytics.volume",
    wide: false,
    Icon: LiveIcon,
  },
  {
    id: "analytics-average-wait-time",
    key: "panels.analytics.wait",
    wide: false,
    Icon: ClockIcon,
  },
  {
    id: "analytics-congestion-heatmap",
    key: "panels.analytics.heatmap",
    wide: false,
    Icon: MapPinIcon,
  },
  {
    id: "analytics-csv-export",
    key: "panels.analytics.csv",
    wide: false,
    Icon: ChartIcon,
  },
  {
    id: "analytics-data-table",
    key: "panels.analytics.table",
    wide: true,
    Icon: ChartIcon,
  },
];

export default function AnalyticsTab() {
  const { t } = useT();

  return (
    <div className="tab-grid">
      {PANELS.map(({ id, key, wide, Icon }) => (
        <section
          key={id}
          className={wide ? "section-panel wide" : "section-panel"}
          aria-labelledby={id}
        >
          <header>
            <span className="section-icon">
              <Icon size={18} />
            </span>
            <h2 id={id}>{t(`${key}.title`)}</h2>
            <span className="soon-chip">{t("common.comingSoon")}</span>
          </header>
          <p className="muted">{t(`${key}.text`)}</p>
        </section>
      ))}
    </div>
  );
}
