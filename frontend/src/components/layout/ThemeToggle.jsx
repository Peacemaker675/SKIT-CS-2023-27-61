import { useTheme } from "../../theme/theme.js";
import { useT } from "../../i18n/i18n.js";
import { MoonIcon, SunIcon } from "../icons.jsx";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useT();
  const label = t(
    theme === "dark" ? "common.switchToLight" : "common.switchToDark",
  );

  return (
    <button
      type="button"
      className="icon-button"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
