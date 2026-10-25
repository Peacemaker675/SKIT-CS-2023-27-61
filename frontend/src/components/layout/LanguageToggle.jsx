import { useT } from "../../i18n/i18n.js";

// EN / हिं switch. Shows the language you would switch to.
export default function LanguageToggle() {
  const { lang, t, toggle } = useT();

  return (
    <button
      type="button"
      className="icon-button lang-toggle"
      onClick={toggle}
      aria-label={t("common.switchLanguage")}
      title={t("common.switchLanguage")}
      lang={lang === "hi" ? "en" : "hi"}
    >
      {lang === "hi" ? "EN" : "हिं"}
    </button>
  );
}
