import { useT } from "../i18n/i18n.js";

// Full-page loader, e.g. while the session is being checked.
// `labelKey` is a translation key.
export default function Spinner({ labelKey = "common.loading" }) {
  const { t } = useT();
  return (
    <div className="center" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{t(labelKey)}</span>
    </div>
  );
}
