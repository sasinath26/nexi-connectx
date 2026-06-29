import { Fragment, useEffect, useMemo, useState } from 'react';
import { getWorkflowHistory, getWorkflowLogs } from '../api/client';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';

function levelClass(level) {
  const l = (level || 'INFO').toUpperCase();
  if (l === 'ERROR' || l === 'FAILED') return 'ncx-log-level--error';
  if (l === 'WARN') return 'ncx-log-level--warn';
  if (l === 'SUCCESS') return 'ncx-log-level--success';
  return 'ncx-log-level--info';
}

export default function LogsCenter() {
  const [history, setHistory] = useState([]);
  const [apiLogs, setApiLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const load = () => {
      Promise.all([
        getWorkflowHistory(),
        getWorkflowLogs().catch(() => ({ data: [] })),
      ])
        .then(([histRes, logsRes]) => {
          setHistory(Array.isArray(histRes.data) ? histRes.data : []);
          setApiLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
        })
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 12000);
    return () => clearInterval(interval);
  }, []);

  const logRows = useMemo(() => {
    const rows = [];
    history.forEach((h) => {
      rows.push({
        id: `hist-${h.id}`,
        time: h.startedAt,
        level: h.status === 'FAILED' ? 'ERROR' : h.status === 'SUCCESS' ? 'SUCCESS' : 'INFO',
        component: h.routeId || 'workflow',
        message: h.errorMessage || `Execution ${h.status} — ${h.processingTimeMs ?? 0}ms`,
        detail: h.errorMessage,
        env: 'production',
      });
    });
    apiLogs.forEach((l) => {
      rows.push({
        id: `log-${l.id}`,
        time: l.timestamp,
        level: l.level || 'INFO',
        component: l.component || 'system',
        message: l.message,
        detail: l.stackTrace || l.message,
        env: 'production',
      });
    });
    return rows.sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [history, apiLogs]);

  const filtered = logRows.filter((row) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      row.message?.toLowerCase().includes(q) ||
      row.component?.toLowerCase().includes(q);
    const matchLevel =
      levelFilter === 'ALL' || row.level?.toUpperCase() === levelFilter;
    return matchSearch && matchLevel;
  });

  const exportLogs = () => {
    const text = filtered.map((r) => `[${r.time}] ${r.level} ${r.component}: ${r.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexi-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState message="Loading logs…" />;

  return (
    <>
      <PageHeader
        title="Logs"
        subtitle="Centralized log management with search, filters, and export"
        environmentPrefix="Logs for deployment"
        actions={
          <button type="button" className="ncx-btn ncx-btn--secondary" onClick={exportLogs}>
            ↓ Export
          </button>
        }
      />

      <section className="ncx-card">
        <div className="ncx-card__body">
          <div className="ncx-toolbar">
            <input
              className="ncx-input"
              placeholder="Search logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {['ALL', 'ERROR', 'WARN', 'INFO', 'SUCCESS'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`ncx-btn ncx-btn--sm ${levelFilter === lvl ? 'ncx-btn--primary' : 'ncx-btn--secondary'}`}
                onClick={() => setLevelFilter(lvl)}
              >
                {lvl}
              </button>
            ))}
            <span className="ncx-live" style={{ marginLeft: 'auto' }}>
              <span className="ncx-live__dot" /> Streaming
            </span>
          </div>

          <div className="ncx-table-wrap ncx-log-viewer">
            <table className="ncx-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Time</th>
                  <th style={{ width: 80 }}>Level</th>
                  <th style={{ width: 140 }}>Component</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="ncx-empty">
                      No logs match filters
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className="ncx-table__row-click"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      style={{ cursor: row.detail ? 'pointer' : 'default' }}
                    >
                      <td className="ncx-table__meta">
                        {row.time ? new Date(row.time).toLocaleTimeString() : '—'}
                      </td>
                      <td>
                        <span className={levelClass(row.level)}>{row.level}</span>
                      </td>
                      <td className="ncx-table__meta">{row.component}</td>
                      <td>{row.message}</td>
                    </tr>
                    {expandedId === row.id && row.detail && (
                      <tr>
                        <td colSpan={4} style={{ background: '#f9fafb', padding: '0.75rem 1rem' }}>
                          <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                            {row.detail}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
