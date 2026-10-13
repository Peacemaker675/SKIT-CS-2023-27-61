// Logo mark + "IntelliRoute" wordmark. The wordmark is text (not the PNG
// wordmark) so it stays sharp and follows the light/dark theme.
export default function Brand({ size = 30, className = "" }) {
  return (
    <span className={`brand ${className}`}>
      <img src="/logo.png" alt="" width={size} height={size} />
      <span className="brand-name">
        Intelli<span className="brand-accent">Route</span>
      </span>
    </span>
  );
}
