import { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';

const CONNECTIONS = [
  { id: 1, name: 'finance-db-prod', type: 'PostgreSQL', category: 'db', env: 'PROD', status: 'healthy', usedIn: 24, host: '18.212.49.148:5433' },
  { id: 2, name: 'analytics-mysql-qa', type: 'MySQL', category: 'db', env: 'QA', status: 'healthy', usedIn: 8, host: 'mysql.qa.internal:3306' },
  { id: 3, name: 'legacy-oracle', type: 'Oracle', category: 'db', env: 'PROD', status: 'warning', usedIn: 3, host: 'oracle.corp:1521' },
  { id: 4, name: 'events-kafka', type: 'Kafka', category: 'kafka', env: 'PROD', status: 'offline', usedIn: 12, host: 'kafka:9092' },
  { id: 5, name: 'partner-api', type: 'REST API', category: 'api', env: 'PROD', status: 'healthy', usedIn: 15, host: 'https://api.partner.com' },
  { id: 6, name: 'inbound-sftp', type: 'SFTP', category: 'sftp', env: 'STAGE', status: 'healthy', usedIn: 6, host: 'sftp.partner.com:22' },
  { id: 7, name: 'data-lake-s3', type: 'S3', category: 'api', env: 'PROD', status: 'healthy', usedIn: 9, host: 's3://nexi-data-lake' },
  { id: 8, name: 'cache-redis', type: 'Redis', category: 'db', env: 'PROD', status: 'healthy', usedIn: 4, host: 'redis:6379' },
];

export default function Connections() {
  const [testing, setTesting] = useState(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('table');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return CONNECTIONS.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.env.toLowerCase().includes(q)
    );
  }, [search]);

  const handleTest = (id) => {
    setTesting(id);
    setTimeout(() => setTesting(null), 1500);
  };

  return (
    <>
      <PageHeader
        title="Connections"
        subtitle="Connections configured for this deployment (Spring active profile)"
        environmentPrefix="Connections on"
        actions={
          <button type="button" className="ncx-btn ncx-btn--primary">
            + Add Connection
          </button>
        }
      />

      <section className="ncx-card">
        <div className="ncx-card__body">
          <div className="ncx-toolbar">
            <input
              className="ncx-input"
              placeholder="Search connections…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className={`ncx-btn ncx-btn--sm ${view === 'table' ? 'ncx-btn--primary' : 'ncx-btn--secondary'}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={`ncx-btn ncx-btn--sm ${view === 'cards' ? 'ncx-btn--primary' : 'ncx-btn--secondary'}`}
              onClick={() => setView('cards')}
            >
              Cards
            </button>
          </div>

          {view === 'table' ? (
            <div className="ncx-table-wrap">
              <table className="ncx-table">
                <thead>
                  <tr>
                    <th>Connection</th>
                    <th>Type</th>
                    <th>Environment</th>
                    <th>Health</th>
                    <th>Usage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((conn) => (
                    <tr key={conn.id}>
                      <td>
                        <div className="ncx-table__name">{conn.name}</div>
                        <div className="ncx-table__meta">{conn.host}</div>
                      </td>
                      <td>{conn.type}</td>
                      <td>
                        <span className="ncx-badge ncx-badge--neutral">{conn.env}</span>
                      </td>
                      <td>
                        <span className={`ncx-dot ${conn.status === 'healthy' ? 'ncx-dot--up' : conn.status === 'offline' ? 'ncx-dot--down' : ''}`} />
                        <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{conn.status}</span>
                      </td>
                      <td className="ncx-table__meta">{conn.usedIn} workflows</td>
                      <td>
                        <button
                          type="button"
                          className="ncx-btn ncx-btn--secondary ncx-btn--sm"
                          disabled={testing === conn.id}
                          onClick={() => handleTest(conn.id)}
                        >
                          {testing === conn.id ? 'Testing…' : 'Test'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ncx-conn-grid" style={{ marginTop: '1rem' }}>
              {filtered.map((conn) => (
                <article key={conn.id} className="ncx-conn-card">
                  <div className={`ncx-conn-card__icon ncx-conn-card__icon--${conn.category}`}>⬡</div>
                  <h3 className="ncx-table__name">{conn.name}</h3>
                  <p className="ncx-table__meta">{conn.type}</p>
                  <div style={{ display: 'flex', gap: '0.35rem', margin: '0.5rem 0' }}>
                    <span className="ncx-badge ncx-badge--neutral">{conn.env}</span>
                    <span className={`ncx-badge ncx-badge--${conn.status === 'healthy' ? 'success' : conn.status === 'offline' ? 'danger' : 'warning'}`}>
                      {conn.status}
                    </span>
                  </div>
                  <p className="ncx-table__meta">Used in {conn.usedIn} workflows</p>
                  <button
                    type="button"
                    className="ncx-btn ncx-btn--secondary ncx-btn--sm"
                    style={{ marginTop: '0.75rem' }}
                    onClick={() => handleTest(conn.id)}
                  >
                    Test Connection
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
