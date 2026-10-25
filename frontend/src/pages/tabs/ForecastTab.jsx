import { CompassIcon, ForecastIcon } from "../../components/icons.jsx";
import { useT } from "../../i18n/i18n.js";

// SRS Tab 3 (Forecast): placeholder panels for now.
const PANELS = [
  {
    id: "forecast-predictive-map",
    key: "panels.forecast.map",
    wide: true,
    Icon: CompassIcon,
  },
  {
    id: "forecast-predictive-insights",
    key: "panels.forecast.insights",
    wide: false,
    Icon: ForecastIcon,
  },
];

export default function ForecastTab() {
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
