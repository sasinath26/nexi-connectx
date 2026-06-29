/** Deployment environment badge (read-only, from Spring active profile). */
export default function EnvironmentBadge({ env, showDot = true, className = '' }) {
  const code = (env || 'DEV').toUpperCase();
  const variant = code.toLowerCase();

  return (
    <span
      className={`ncx-env-badge ncx-env-badge--${variant} ${className}`.trim()}
      title={`Deployment environment: ${code}`}
    >
      {showDot && <span className="ncx-env-badge__dot" aria-hidden />}
      {code}
    </span>
  );
}
