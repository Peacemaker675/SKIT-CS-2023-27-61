import { LockIcon, MapPinIcon, LiveIcon } from "../../components/icons.jsx";
import { useT } from "../../i18n/i18n.js";

// SRS Tab 4 (System Management, admin only): placeholder panels for now.
const PANELS = [
  {
    id: "system-user-management",
    key: "panels.system.users",
    wide: false,
    Icon: LockIcon,
  },
  {
    id: "system-intersection-config",
    key: "panels.system.intersections",
    wide: false,
    Icon: MapPinIcon,
  },
  {
    id: "system-health-monitor",
    key: "panels.system.health",
    wide: true,
    Icon: LiveIcon,
  },
];

export default function SystemTab() {
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
