const MAP = {
  SUCCESS: 'success',
  SUCCESSFUL: 'success',
  ACTIVE: 'success',
  Started: 'success',
  RUNNING: 'info',
  RUNNING_WORKFLOW: 'info',
  FAILED: 'danger',
  DLQ: 'danger',
  Stopped: 'warning',
  DRAFT: 'neutral',
  RETRYING: 'warning',
  PENDING: 'neutral',
  WAITING: 'neutral',
  Suspended: 'neutral',
};

export default function StatusBadge({ status, className = '' }) {
  const variant = MAP[status] || 'neutral';
  return (
    <span className={`ncx-badge ncx-badge--${variant} ${className}`.trim()}>
      {status || '—'}
    </span>
  );
}
