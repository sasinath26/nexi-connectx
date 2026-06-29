export default function MetricCard({ label, value, delta, deltaType, variant = '' }) {
  return (
    <article className={`ncx-metric ncx-metric--${variant}`.trim()}>
      <p className="ncx-metric__label">{label}</p>
      <p className="ncx-metric__value">{value}</p>
      {delta != null && (
        <p className={`ncx-metric__delta ncx-metric__delta--${deltaType || 'up'}`}>{delta}</p>
      )}
    </article>
  );
}
