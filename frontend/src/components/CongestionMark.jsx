import { CONGESTION } from "../lib/congestion.js";

// Coloured symbol for a congestion level. Always shown next to the level's
// name, so it is hidden from screen readers.
export default function CongestionMark({ level }) {
  const { color, symbol } = CONGESTION[level];
  return (
    <span
      className="congestion-mark"
      style={{ background: color }}
      aria-hidden="true"
    >
      {symbol}
    </span>
  );
}
