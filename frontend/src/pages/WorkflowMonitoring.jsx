import { useEffect, useState } from 'react';
import { getDashboard, getRoutes, getWorkflowLogs, startRoute, stopRoute } from '../api/client';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingState from '../components/ui/LoadingState';

export default function WorkflowMonitoring() {
  const [routes, setRoutes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [routesRes, logsRes, dashRes] = await Promise.all([
        getRoutes(),
        getWorkflowLogs(),
        getDashboard().catch(() => ({ data: null })),
      ]);
      setRoutes(routesRes.data || []);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      setDash(dashRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (routeId) => {
    await startRoute(routeId);
    load();
  };

  const handleStop = async (routeId) => {
    await stopRoute(routeId);
    load();
  };

  if (loading) return <LoadingState message="Loading monitoring data…" />;

  const running = routes.filter((r) => r.status === 'Started').length;

  return (
    <>
      <PageHeader
        title="Monitoring"
        subtitle="Real-time workflow execution, routes, and system metrics"
        environmentPrefix="Monitoring"
        actions={
          <span className="ncx-live">
            <span className="ncx-live__dot" /> Live refresh · 8s
          </span>
        }
      />

      <section className="ncx-metrics">
        <MetricCard label="Running Routes" value={running} variant="primary" />
        <MetricCard label="Total Routes" value={routes.length} />
        <MetricCard label="Executions" value={dash?.totalExecutions ?? '—'} />
        <MetricCard
          label="Failures"
          value={dash?.failureCount ?? 0}
          variant="danger"
        />
        <MetricCard
          label="Avg Processing"
          value={`${dash?.avgProcessingTimeMs ?? 0}ms`}
        />
        <MetricCard label="DLQ" value={dash?.dlqCount ?? 0} variant="warning" />
      </section>

      <div className="ncx-grid-2">
        <section className="ncx-card">
          <div className="ncx-card__header">
            <h2 className="ncx-card__title">Running Workflows & Routes</h2>
          </div>
          <div className="ncx-card__body ncx-card__body--flush">
            <div className="ncx-table-wrap">
              <table className="ncx-table">
                <thead>
                  <tr>
                    <th>Route ID</th>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th>Success</th>
                    <th>Failures</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.routeId}>
                      <td className="ncx-table__name">{route.routeId}</td>
                      <td className="ncx-table__meta" style={{ maxWidth: 200 }}>
                        {route.endpoint}
                      </td>
                      <td>
                        <StatusBadge status={route.status} />
                      </td>
                      <td>{route.metrics?.successCount ?? '—'}</td>
                      <td>{route.metrics?.failureCount ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="ncx-btn ncx-btn--primary ncx-btn--sm"
                          onClick={() => handleStart(route.routeId)}
                        >
                          Start
                        </button>{' '}
                        <button
                          type="button"
                          className="ncx-btn ncx-btn--secondary ncx-btn--sm"
                          onClick={() => handleStop(route.routeId)}
                        >
                          Stop
                        </button>
                      </td>
                    </tr>
                  ))}
                  {routes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="ncx-empty">
                        No routes registered
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ncx-card">
          <div className="ncx-card__header">
            <h2 className="ncx-card__title">Resource Utilization</h2>
          </div>
          <div className="ncx-card__body">
            <div className="ncx-health-grid">
              <div className="ncx-health-item">
                <div className="ncx-health-item__label">Queue Depth</div>
                <div className="ncx-health-item__status">{dash?.dlqCount ?? 0} messages</div>
              </div>
              <div className="ncx-health-item">
                <div className="ncx-health-item__label">Throughput</div>
                <div className="ncx-health-item__status">
                  {dash?.successCount ?? 0} records
                </div>
              </div>
              <div className="ncx-health-item">
                <div className="ncx-health-item__label">Retry Rate</div>
                <div className="ncx-health-item__status">Low</div>
              </div>
              <div className="ncx-health-item">
                <div className="ncx-health-item__label">Engine</div>
                <div className="ncx-health-item__status">
                  <span className="ncx-dot ncx-dot--up" /> Camel Active
                </div>
              </div>
            </div>
            <div className="ncx-chart-bars" style={{ marginTop: '1.25rem', height: 80 }}>
              {[40, 65, 55, 80, 45, 70, 60].map((h, i) => (
                <div key={i} className="ncx-chart-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="ncx-table__meta" style={{ marginTop: '0.5rem' }}>
              Execution throughput (last 7 intervals)
            </p>
          </div>
        </section>
      </div>

      <section className="ncx-card">
        <div className="ncx-card__header">
          <h2 className="ncx-card__title">Live Execution Logs</h2>
        </div>
        <div className="ncx-card__body ncx-card__body--flush ncx-log-viewer">
          <div className="ncx-table-wrap">
            <table className="ncx-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map((log) => (
                  <tr key={log.id}>
                    <td className="ncx-table__meta">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                    </td>
                    <td>
                      <span className={`ncx-log-level--${(log.level || 'info').toLowerCase()}`}>
                        {log.level}
                      </span>
                    </td>
                    <td>{log.message}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="ncx-empty">
                      No live logs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
