import { Link } from "react-router-dom";
import Brand from "../components/layout/Brand.jsx";
import { CompassIcon } from "../components/icons.jsx";
import { useT } from "../i18n/i18n.js";

export default function NotFound() {
  const { t } = useT();

  return (
    <div className="center auth-bg">
      <div className="card status-card">
        <Brand />
        <span className="empty-icon">
          <CompassIcon size={26} />
        </span>
        <h1>{t("notFound.title")}</h1>
        <p className="muted">{t("notFound.text")}</p>
        <Link className="button-link" to="/">
          {t("notFound.home")}
        </Link>
      </div>
    </div>
  );
}
