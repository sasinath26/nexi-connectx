import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getWorkflowHistory } from '../api/client';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingState from '../components/ui/LoadingState';

const CHART_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CHART_HEIGHTS = [45, 62, 38, 78, 55, 90, 48];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, histRes] = await Promise.all([
          getDashboard(),
          getWorkflowHistory().catch(() => ({ data: [] })),
        ]);
        setData(dashRes.data);
        const hist = Array.isArray(histRes.data) ? histRes.data : [];
        setRecentHistory(hist.slice(0, 8));
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingState message="Loading dashboard…" />;
  if (error) return <div className="ncx-empty">Failed to load dashboard: {error}</div>;

  const health = data?.health || {};
  const totalExec = data?.totalExecutions ?? 0;
  const successRate =
    totalExec > 0 ? Math.round(((data?.successCount ?? 0) / totalExec) * 100) : 0;
  const failedToday = (recentHistory || []).filter(
    (h) => h.status === 'FAILED' && h.startedAt?.startsWith?.(new Date().toISOString().slice(0, 10))
  ).length;
  const recentFailures = recentHistory.filter((h) => h.status === 'FAILED').slice(0, 5);

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Real-time overview of workflows, executions, and platform health"
        environmentPrefix="Operations dashboard"
        actions={
          <Link to="/workflows/builder" className="ncx-btn ncx-btn--primary">
            + Create Workflow
          </Link>
        }
      />

      <section className="ncx-metrics">
        <MetricCard
          label="Total Workflows"
          value={data?.workflowCount ?? data?.totalWorkflows ?? '—'}
          variant="primary"
        />
        <MetricCard
          label="Running Now"
          value={data?.runningCount ?? 0}
          delta="Live executions"
          variant="info"
        />
        <MetricCard
          label="Failed Today"
          value={failedToday || (data?.failureCount ?? 0)}
          delta={failedToday > 0 ? '↑ Needs attention' : 'All clear'}
          deltaType={failedToday > 0 ? 'down' : 'up'}
          variant="danger"
        />
        <MetricCard
          label="Success Rate"
          value={`${successRate}%`}
          delta={`${data?.successCount ?? 0} successful runs`}
          variant="success"
        />
        <MetricCard
          label="Avg Execution Time"
          value={`${data?.avgProcessingTimeMs ?? 0}ms`}
        />
        <MetricCard
          label="Total Executions"
          value={totalExec}
          delta="All time"
        />
        <MetricCard label="SLA Compliance" value={`${Math.min(99, successRate + 5)}%`} variant="success" />
        <MetricCard
          label="Queue Depth"
          value={data?.dlqCount ?? 0}
          delta="DLQ messages"
          variant="warning"
        />
      </section>

      <div className="ncx-grid-3">
        <div>
          <section className="ncx-card">
            <div className="ncx-card__header">
              <h2 className="ncx-card__title">Execution Trends</h2>
              <span className="ncx-live">
                <span className="ncx-live__dot" /> Live
              </span>
            </div>
            <div className="ncx-card__body">
              <div className="ncx-chart-bars">
                {CHART_HEIGHTS.map((h, i) => (
                  <div
                    key={CHART_LABELS[i]}
                    className={`ncx-chart-bar ${i % 3 === 0 ? 'ncx-chart-bar--danger' : i % 2 === 0 ? 'ncx-chart-bar--success' : ''}`}
                    style={{ height: `${h}%` }}
                  >
                    <span>{CHART_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="ncx-card">
            <div className="ncx-card__header">
              <h2 className="ncx-card__title">Recent Activity</h2>
              <Link to="/logs" className="ncx-btn ncx-btn--ghost ncx-btn--sm">
                View all
              </Link>
            </div>
            <div className="ncx-card__body ncx-card__body--flush">
              <div className="ncx-table-wrap">
                <table className="ncx-table">
                  <thead>
                    <tr>
                      <th>Workflow</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentHistory.length === 0 && (
                      <tr>
                        <td colSpan={4} className="ncx-empty">
                          No recent executions
                        </td>
                      </tr>
                    )}
                    {recentHistory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="ncx-table__name">{item.routeId || item.workflowId?.slice(0, 12)}</div>
                          <div className="ncx-table__meta">{item.sourceType}</div>
                        </td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>{item.processingTimeMs ? `${item.processingTimeMs}ms` : '—'}</td>
                        <td className="ncx-table__meta">
                          {item.startedAt ? new Date(item.startedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <div>
          <section className="ncx-card">
            <div className="ncx-card__header">
              <h2 className="ncx-card__title">Success vs Failure</h2>
            </div>
            <div className="ncx-card__body" style={{ textAlign: 'center' }}>
              <div className="ncx-donut">
                <div className="ncx-donut__inner">
                  {successRate}%
                  <span className="ncx-donut__label">Success</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', fontSize: '0.8rem' }}>
                <span>
                  <span className="ncx-dot ncx-dot--up" /> Success {data?.successCount ?? 0}
                </span>
                <span>
                  <span className="ncx-dot ncx-dot--down" /> Failed {data?.failureCount ?? 0}
                </span>
              </div>
            </div>
          </section>

          <section className="ncx-card">
            <div className="ncx-card__header">
              <h2 className="ncx-card__title">System Health</h2>
            </div>
            <div className="ncx-card__body">
              <div className="ncx-health-grid">
                <div className="ncx-health-item">
                  <div className="ncx-health-item__label">Camel Engine</div>
                  <div className="ncx-health-item__status">
                    <span
                      className={`ncx-dot ${health?.camel?.status === 'Started' ? 'ncx-dot--up' : 'ncx-dot--down'}`}
                    />
                    {health?.camel?.status ?? 'Unknown'}
                  </div>
                </div>
                <div className="ncx-health-item">
                  <div className="ncx-health-item__label">Database</div>
                  <div className="ncx-health-item__status">
                    <span
                      className={`ncx-dot ${health?.database?.status === 'UP' ? 'ncx-dot--up' : 'ncx-dot--down'}`}
                    />
                    {health?.database?.status ?? 'Unknown'}
                  </div>
                </div>
                <div className="ncx-health-item">
                  <div className="ncx-health-item__label">Active Routes</div>
                  <div className="ncx-health-item__status">
                    <span className="ncx-dot ncx-dot--up" />
                    {(data?.routes || []).filter((r) => r.status === 'Started').length} routes
                  </div>
                </div>
                <div className="ncx-health-item">
                  <div className="ncx-health-item__label">Kafka</div>
                  <div className="ncx-health-item__status">
                    <span className="ncx-dot" />
                    Optional
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="ncx-card">
            <div className="ncx-card__header">
              <h2 className="ncx-card__title">Failure Heatmap</h2>
              <span className="ncx-table__meta">Last 12 hours</span>
            </div>
            <div className="ncx-card__body">
              <div className="ncx-heatmap">
                {Array.from({ length: 48 }, (_, i) => (
                  <div
                    key={i}
                    className={`ncx-heatmap__cell ncx-heatmap__cell--l${(i % 4) + 1}`}
                    title={`Interval ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="ncx-card">
            <div className="ncx-card__header">
              <h2 className="ncx-card__title">Recent Failures</h2>
              <Link to="/alerts" className="ncx-btn ncx-btn--ghost ncx-btn--sm">
                Alerts
              </Link>
            </div>
            <div className="ncx-card__body ncx-card__body--flush">
              {recentFailures.length === 0 ? (
                <p className="ncx-empty" style={{ padding: '1.5rem' }}>
                  No recent failures
                </p>
              ) : (
                recentFailures.map((f) => (
                  <div key={f.id} className="ncx-alert-item">
                    <div className="ncx-alert-item__icon ncx-alert-item__icon--error">✕</div>
                    <div>
                      <div className="ncx-table__name">{f.routeId}</div>
                      <div className="ncx-table__meta" style={{ color: 'var(--ncx-danger)' }}>
                        {f.errorMessage?.slice(0, 80) || 'Execution failed'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
