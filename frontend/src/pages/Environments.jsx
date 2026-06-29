import PageHeader from '../components/ui/PageHeader';
import EnvironmentBadge from '../components/ui/EnvironmentBadge';
import { usePlatformEnvironment } from '../context/PlatformEnvironmentContext';
import LoadingState from '../components/ui/LoadingState';

/**
 * Read-only deployment context for this Spring Boot instance.
 * One deployment = one environment (no in-app switching).
 */
export default function Environments() {
  const { environment, profile, isProduction, loading } = usePlatformEnvironment();

  if (loading) return <LoadingState message="Loading deployment context…" />;

  return (
    <>
      <PageHeader
        title="Deployment Context"
        subtitle="This instance runs a single environment from Spring active profile"
        showEnvironment={false}
      />

      <section className="ncx-card">
        <div className="ncx-card__body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <EnvironmentBadge env={environment} />
            <div>
              <div className="ncx-table__name">Active profile: {profile}</div>
              <div className="ncx-table__meta">
                Configured via <code>spring.profiles.active</code> (e.g. application-{profile}.yml)
              </div>
            </div>
          </div>

          {isProduction && (
            <div
              className="ncx-prod-banner"
              style={{ borderRadius: '8px', marginBottom: '1.25rem' }}
            >
              <span>
                <strong>Production deployment</strong> — use nexi-prod.company.com. Environment
                cannot be changed from the UI.
              </span>
            </div>
          )}

          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Architecture
          </h3>
          <ul className="ncx-table__meta" style={{ lineHeight: 1.7, paddingLeft: '1.25rem' }}>
            <li>DEV → nexi-dev.company.com</li>
            <li>QA → nexi-qa.company.com</li>
            <li>STAGE → nexi-stage.company.com</li>
            <li>PROD → nexi-prod.company.com</li>
          </ul>
          <p className="ncx-table__meta" style={{ marginTop: '1rem' }}>
            Workflow definitions are shared per deployment. Connection mappings and secrets are
            resolved from the active profile for this instance only.
          </p>
        </div>
      </section>
    </>
  );
}
