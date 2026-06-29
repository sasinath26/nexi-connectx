import { usePlatformEnvironment } from '../../context/PlatformEnvironmentContext';
import EnvironmentBadge from '../ui/EnvironmentBadge';

/** Shown globally when deployment is production. */
export default function EnvironmentBanner() {
  const { isProduction, loading } = usePlatformEnvironment();

  if (loading || !isProduction) return null;

  return (
    <div className="ncx-prod-banner" role="status">
      <EnvironmentBadge env="PROD" />
      <span className="ncx-prod-banner__text">
        <strong>Production environment</strong>
        <span className="ncx-prod-banner__sub">Changes affect live workflows</span>
      </span>
    </div>
  );
}
