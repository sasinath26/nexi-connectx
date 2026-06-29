import { usePlatformEnvironment } from '../../context/PlatformEnvironmentContext';
import EnvironmentBadge from './EnvironmentBadge';

/**
 * Page-level deployment context (not a switcher).
 * @param {string} [prefix] - e.g. "Environment", "Running in"
 */
export default function PageEnvironmentContext({ prefix = 'Environment' }) {
  const { environment, loading } = usePlatformEnvironment();

  if (loading) {
    return <p className="ncx-page-env-line ncx-page-env-line--loading">Loading deployment context…</p>;
  }

  return (
    <p className="ncx-page-env-line">
      <span className="ncx-page-env-line__label">{prefix}:</span>
      <EnvironmentBadge env={environment} />
    </p>
  );
}
