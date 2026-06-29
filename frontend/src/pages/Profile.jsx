import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import EnvironmentBadge from '../components/ui/EnvironmentBadge';
import { usePlatformEnvironment } from '../context/PlatformEnvironmentContext';

export default function Profile() {
  const { environment, profile, isProduction } = usePlatformEnvironment();

  return (
    <>
      <PageHeader title="Profile" subtitle="Account settings and session preferences" showEnvironment={false} />

      <div className="ncx-grid-2">
        <section className="ncx-card">
          <div className="ncx-card__body" style={{ textAlign: 'center', padding: '2rem' }}>
            <div
              className="app-topbar__avatar"
              style={{ width: 72, height: 72, fontSize: '1.5rem', margin: '0 auto 1rem' }}
            >
              SA
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>System Admin</h2>
            <p className="ncx-table__meta">admin@nexiconnectx.com</p>
            <span className="ncx-badge ncx-badge--primary" style={{ marginTop: '0.75rem' }}>
              Platform Admin
            </span>
          </div>
        </section>

        <section className="ncx-card">
          <div className="ncx-card__header">
            <h2 className="ncx-card__title">Deployment</h2>
          </div>
          <div className="ncx-card__body">
            <p className="ncx-table__meta" style={{ marginBottom: '0.75rem' }}>
              You are signed into this instance only. Environment is determined by the server, not
              user preference.
            </p>
            <EnvironmentBadge env={environment} />
            <p className="ncx-table__meta" style={{ marginTop: '0.75rem' }}>
              Spring profile: <strong>{profile}</strong>
            </p>
            {isProduction && (
              <p className="ncx-table__meta" style={{ color: 'var(--ncx-danger)', marginTop: '0.5rem' }}>
                Production deployment — destructive actions require extra confirmation.
              </p>
            )}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ncx-text-muted)', marginBottom: '0.35rem' }}>
                Timezone
              </label>
              <select className="ncx-select" defaultValue="UTC">
                <option>UTC</option>
                <option>America/New_York</option>
                <option>Asia/Kolkata</option>
              </select>
            </div>
            <Link to="/settings" className="ncx-btn ncx-btn--secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
              Account Settings
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
