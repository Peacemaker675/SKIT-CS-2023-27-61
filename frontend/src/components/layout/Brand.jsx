// Logo + name. The name is text rather than an image so it follows the theme.
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
