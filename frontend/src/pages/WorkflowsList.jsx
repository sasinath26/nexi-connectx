import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteWorkflowDefinition,
  getWorkflowDefinitions,
  getWorkflowHistory,
} from '../api/client';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingState from '../components/ui/LoadingState';
import { usePlatformEnvironment } from '../context/PlatformEnvironmentContext';
import { confirmProductionAction } from '../utils/productionSafety';

const TAGS = ['ETL', 'API', 'Batch', 'Realtime', 'Critical'];

export default function WorkflowsList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);
  const { isProduction } = usePlatformEnvironment();

  useEffect(() => {
    Promise.all([
      getWorkflowDefinitions(),
      getWorkflowHistory().catch(() => ({ data: [] })),
    ])
      .then(([wfRes, histRes]) => {
        setWorkflows(wfRes.data || []);
        setHistory(Array.isArray(histRes.data) ? histRes.data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => {
    return workflows.map((wf, i) => {
      const runs = history.filter(
        (h) =>
          h.workflowDefinitionId === wf.id ||
          h.routeId?.includes?.(`dynamic-workflow-${wf.id}`)
      );
      const success = runs.filter((r) => r.status === 'SUCCESS').length;
      const last = runs.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
      const avgRuntime =
        runs.length > 0
          ? Math.round(
              runs.reduce((s, r) => s + (r.processingTimeMs || 0), 0) / runs.length
            )
          : null;
      return {
        ...wf,
        tag: TAGS[i % TAGS.length],
        lastRun: last?.startedAt,
        successRate: runs.length ? Math.round((success / runs.length) * 100) : null,
        avgRuntime,
      };
    });
  }, [workflows, history]);

  const filtered = enriched.filter((wf) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      wf.name?.toLowerCase().includes(q) ||
      wf.code?.toLowerCase().includes(q) ||
      wf.tag?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || wf.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteWorkflow = async (workflow) => {
    if (
      !confirmProductionAction(
        isProduction,
        `Delete workflow "${workflow.name}" in PRODUCTION? This cannot be undone.`
      )
    ) {
      return;
    }
    const confirmed = window.confirm(
      `Delete workflow "${workflow.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(workflow.id);
      await deleteWorkflowDefinition(workflow.id);
      setWorkflows((prev) => prev.filter((w) => w.id !== workflow.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(workflow.id);
        return next;
      });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete workflow.';
      window.alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingState message="Loading workflows…" />;

  return (
    <>
      <PageHeader
        title="Workflows"
        subtitle="Manage, monitor, and deploy data orchestration pipelines on this deployment"
        environmentPrefix="Deployment"
        actions={
          <>
            {selected.size > 0 && (
              <button type="button" className="ncx-btn ncx-btn--secondary">
                Bulk actions ({selected.size})
              </button>
            )}
            <Link to="/workflows/builder" className="ncx-btn ncx-btn--primary">
              + Create Workflow
            </Link>
          </>
        }
      />

      <section className="ncx-metrics" style={{ marginBottom: '1.25rem' }}>
        <article className="ncx-metric ncx-metric--primary">
          <p className="ncx-metric__label">Total</p>
          <p className="ncx-metric__value">{workflows.length}</p>
        </article>
        <article className="ncx-metric ncx-metric--success">
          <p className="ncx-metric__label">Active</p>
          <p className="ncx-metric__value">{workflows.filter((w) => w.status === 'ACTIVE').length}</p>
        </article>
        <article className="ncx-metric">
          <p className="ncx-metric__label">Draft</p>
          <p className="ncx-metric__value">{workflows.filter((w) => w.status === 'DRAFT').length}</p>
        </article>
      </section>

      <section className="ncx-card">
        <div className="ncx-card__body">
          <div className="ncx-toolbar">
            <input
              className="ncx-input"
              placeholder="Search workflows, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="ncx-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div className="ncx-table-wrap">
            <table className="ncx-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" aria-label="Select all" />
                  </th>
                  <th>Workflow Name</th>
                  <th>Status</th>
                  <th>Last Run</th>
                  <th>Success Rate</th>
                  <th>Runtime</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((wf) => (
                  <tr key={wf.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(wf.id)}
                        onChange={() => toggleSelect(wf.id)}
                        aria-label={`Select ${wf.name}`}
                      />
                    </td>
                    <td>
                      <div className="ncx-table__name">{wf.name}</div>
                      <div className="ncx-table__meta">
                        {wf.code}{' '}
                        <span className="ncx-badge ncx-badge--neutral">{wf.tag}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={wf.status} />
                    </td>
                    <td className="ncx-table__meta">
                      {wf.lastRun ? new Date(wf.lastRun).toLocaleString() : 'Never'}
                    </td>
                    <td>
                      {wf.successRate != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="ncx-progress" style={{ width: 72 }}>
                            <div
                              className="ncx-progress__bar"
                              style={{
                                width: `${wf.successRate}%`,
                                background:
                                  wf.successRate >= 80
                                    ? 'var(--ncx-success)'
                                    : wf.successRate >= 50
                                      ? 'var(--ncx-warning)'
                                      : 'var(--ncx-danger)',
                              }}
                            />
                          </div>
                          <span className="ncx-table__meta">{wf.successRate}%</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="ncx-table__meta">
                      {wf.avgRuntime != null ? `${wf.avgRuntime}ms avg` : '—'}
                    </td>
                    <td className="ncx-table__meta">{wf.createdBy || 'System'}</td>
                    <td>
                      <button
                        type="button"
                        className="ncx-btn ncx-btn--secondary ncx-btn--sm"
                        onClick={() =>
                          navigate('/workflows/builder', { state: { workflowId: wf.id } })
                        }
                      >
                        Open
                      </button>
                      {' '}
                      <button
                        type="button"
                        className="ncx-btn ncx-btn--ghost ncx-btn--sm"
                        onClick={() => handleDeleteWorkflow(wf)}
                        disabled={deletingId === wf.id}
                        style={{ color: 'var(--ncx-danger)' }}
                        title="Delete workflow"
                      >
                        {deletingId === wf.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
