import { ClockIcon } from "../icons.jsx";
import { useT } from "../../i18n/i18n.js";

// Placeholder card for dashboard tabs that aren't built yet.
// `tabKey` is the tab's key in config/tabs.js.
export default function ComingSoon({ tabKey }) {
  const { t } = useT();

  return (
    <section className="empty-card">
      <span className="empty-icon">
        <ClockIcon size={26} />
      </span>
      <h2>{t("comingSoonCard.title", { label: t(`tabs.${tabKey}`) })}</h2>
      <p className="muted">{t("comingSoonCard.text")}</p>
    </section>
  );
}
