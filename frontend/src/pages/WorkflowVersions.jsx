import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkflowDefinitions } from '../api/client';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingState from '../components/ui/LoadingState';

const MOCK_VERSIONS = [
  { id: 'v3', label: 'v3.2.0', status: 'PUBLISHED', author: 'Admin', date: '2026-05-24', changes: 4 },
  { id: 'v2', label: 'v3.1.0', status: 'PUBLISHED', author: 'Admin', date: '2026-05-18', changes: 2 },
  { id: 'v1', label: 'v3.0.0', status: 'ARCHIVED', author: 'System', date: '2026-05-01', changes: 12 },
];

export default function WorkflowVersions() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWf, setSelectedWf] = useState(null);
  const [compareA, setCompareA] = useState('v3');
  const [compareB, setCompareB] = useState('v2');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkflowDefinitions()
      .then((res) => {
        const list = res.data || [];
        setWorkflows(list);
        if (list.length) setSelectedWf(list[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const wf = workflows.find((w) => w.id === selectedWf);

  if (loading) return <LoadingState message="Loading versions…" />;

  return (
    <>
      <PageHeader
        title="Workflow Versioning"
        subtitle="Draft, publish, compare, rollback, and track deployment history"
        actions={
          <Link to="/workflows/builder" className="ncx-btn ncx-btn--primary">
            Open Builder
          </Link>
        }
      />

      <div className="ncx-grid-2">
        <section className="ncx-card">
          <div className="ncx-card__header">
            <h2 className="ncx-card__title">Workflows</h2>
          </div>
          <div className="ncx-card__body ncx-card__body--flush">
            {workflows.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`ncx-env-row ${selectedWf === w.id ? 'active' : ''}`}
                onClick={() => setSelectedWf(w.id)}
              >
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div className="ncx-table__name">{w.name}</div>
                  <div className="ncx-table__meta">{w.code}</div>
                </div>
                <StatusBadge status={w.status} />
              </button>
            ))}
            {workflows.length === 0 && <p className="ncx-empty">No workflows</p>}
          </div>
        </section>

        <section className="ncx-card">
          <div className="ncx-card__header">
            <h2 className="ncx-card__title">{wf?.name || 'Select workflow'} — Versions</h2>
            {wf?.status === 'DRAFT' && <span className="ncx-badge ncx-badge--warning">Draft pending</span>}
          </div>
          <div className="ncx-card__body ncx-card__body--flush">
            <div className="ncx-table-wrap">
              <table className="ncx-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Author</th>
                    <th>Date</th>
                    <th>Changes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_VERSIONS.map((v) => (
                    <tr key={v.id}>
                      <td className="ncx-table__name">{v.label}</td>
                      <td>
                        <StatusBadge status={v.status === 'PUBLISHED' ? 'ACTIVE' : 'DRAFT'} />
                      </td>
                      <td className="ncx-table__meta">{v.author}</td>
                      <td className="ncx-table__meta">{v.date}</td>
                      <td>{v.changes} nodes</td>
                      <td>
                        <button type="button" className="ncx-btn ncx-btn--ghost ncx-btn--sm">
                          Rollback
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <section className="ncx-card" style={{ marginTop: '1.25rem' }}>
        <div className="ncx-card__header">
          <h2 className="ncx-card__title">Compare Versions</h2>
        </div>
        <div className="ncx-card__body">
          <div className="ncx-toolbar">
            <select className="ncx-select" value={compareA} onChange={(e) => setCompareA(e.target.value)}>
              {MOCK_VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="ncx-table__meta">vs</span>
            <select className="ncx-select" value={compareB} onChange={(e) => setCompareB(e.target.value)}>
              {MOCK_VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button type="button" className="ncx-btn ncx-btn--secondary ncx-btn--sm">
              Compare
            </button>
          </div>
          <div className="ncx-version-diff">
            <div className="ncx-version-diff__pane">
              <h4>{MOCK_VERSIONS.find((v) => v.id === compareA)?.label}</h4>
              <ul>
                <li className="added">+ Added validation step</li>
                <li className="changed">~ Updated DB connection mapping</li>
              </ul>
            </div>
            <div className="ncx-version-diff__pane">
              <h4>{MOCK_VERSIONS.find((v) => v.id === compareB)?.label}</h4>
              <ul>
                <li className="removed">− Removed legacy transform</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="ncx-card">
        <div className="ncx-card__header">
          <h2 className="ncx-card__title">Deployment History</h2>
        </div>
        <div className="ncx-card__body">
          <p className="ncx-table__meta">
            Approval workflow and deployment audit trail connect to backend when versioning API is enabled.
          </p>
        </div>
      </section>
    </>
  );
}
