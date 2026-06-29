import { Fragment, useEffect, useMemo, useState } from 'react';

const TABS = [
  { id: 'logs', label: 'Logs' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'history', label: 'History' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'failed', label: 'Failed Records' },
];

function formatTime(ts) {
  if (!ts) return '--:--:--';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function highlightTimestamp(text) {
  if (!text) return text;
  return text.replace(
    /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/g,
    '<span class="log-ts">$1</span>'
  );
}

export default function BottomMonitoringPanel({
  logs = [],
  history = [],
  executionNodes = [],
  metrics = null,
  collapsed,
  onToggleCollapse,
  activeTab,
  panelHeight = 280,
  onResizePanel,
}) {
  const [tab, setTab] = useState('logs');

  useEffect(() => {
    if (activeTab) setTab(activeTab);
  }, [activeTab]);
  const [logSearch, setLogSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Safely coerce to arrays — API may return object/null instead of array
  const safeHistory = Array.isArray(history) ? history : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  const failedItems = safeHistory.filter((h) => h.status === 'FAILED' || h.status === 'DLQ');
  const retryItems = safeHistory.filter((h) => h.status === 'RETRYING');

  const allLogLines = useMemo(() => {
    const lines = [];
    executionNodes.forEach((n) => {
      lines.push({
        id: `exec-${n.id}`,
        level: n.status || 'INFO',
        message: `Node ${n.nodeKey} — ${n.status}${n.processingTimeMs != null ? ` (${n.processingTimeMs}ms)` : ''}`,
        timestamp: n.completedAt || n.startedAt,
      });
    });
    safeLogs.forEach((log) => {
      lines.push({
        id: log.id,
        level: log.level || 'INFO',
        message: log.message,
        timestamp: log.timestamp,
      });
    });
    return lines.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [executionNodes, safeLogs]);

  const filteredLogs = useMemo(() => {
    let rows = allLogLines;
    if (levelFilter !== 'ALL') {
      rows = rows.filter((l) => (l.level || 'INFO').toUpperCase() === levelFilter);
    }
    const q = logSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (l) =>
        (l.message || '').toLowerCase().includes(q) ||
        (l.level || '').toLowerCase().includes(q)
    );
  }, [allLogLines, logSearch, levelFilter]);

  const successRate =
    metrics && metrics.totalExecutions > 0
      ? Math.round((metrics.successCount / metrics.totalExecutions) * 100)
      : 0;

  const startResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panelHeight;
    const onMove = (ev) => {
      const next = Math.min(520, Math.max(120, startH + (startY - ev.clientY)));
      onResizePanel?.(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <footer
      className={`bottom-panel ${collapsed ? 'bottom-panel--collapsed' : 'bottom-panel--expanded'}`}
      style={collapsed ? undefined : { '--ent-bottom-panel-h': `${panelHeight}px` }}
    >
      {!collapsed && onResizePanel && (
        <div className="bottom-panel__resize" onMouseDown={startResize} title="Drag to resize" role="separator" />
      )}
      <div className="bottom-panel__header">
        <div className="bottom-panel__tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`bottom-panel__tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="bottom-panel__toggle" onClick={onToggleCollapse}>
          {collapsed ? '▲ Expand' : '▼ Collapse'}
        </button>
      </div>

      {!collapsed && (
        <div className="bottom-panel__body">
          {tab === 'logs' && (
            <>
              <div className="bottom-panel__search-row">
                <div className="log-filter-bar">
                  {['ALL', 'ERROR', 'WARN', 'INFO'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={`log-filter-btn ${levelFilter === lvl ? 'active' : ''}`}
                      onClick={() => setLevelFilter(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <input
                  type="search"
                  className="bottom-panel__search"
                  placeholder="Search logs…"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>
              <div className="bottom-panel__table-wrap">
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Level</th>
                      <th>Component</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <Fragment key={log.id}>
                        <tr
                          className="log-table__row"
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        >
                          <td>{formatTime(log.timestamp)}</td>
                          <td>
                            <span className={`log-level log-level--${(log.level || 'info').toLowerCase()}`}>
                              {log.level || 'INFO'}
                            </span>
                          </td>
                          <td>{log.component || 'workflow'}</td>
                          <td dangerouslySetInnerHTML={{ __html: highlightTimestamp(log.message) }} />
                        </tr>
                        {expandedLogId === log.id && (
                          <tr key={`${log.id}-detail`} className="log-table__detail">
                            <td colSpan={4}>
                              <pre>{log.message}</pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                {filteredLogs.length === 0 && (
                  <p className="bottom-panel__empty">
                    {logSearch || levelFilter !== 'ALL'
                      ? 'No logs match filters'
                      : 'No execution logs yet. Run a workflow to see live output.'}
                  </p>
                )}
              </div>
            </>
          )}

          {tab === 'metrics' && (
            <div className="bottom-panel__metrics">
              {metrics ? (
                <div className="metrics-grid">
                  <div className="metrics-card">
                    <span className="metrics-card__label">Total executions</span>
                    <strong>{metrics.totalExecutions ?? 0}</strong>
                  </div>
                  <div className="metrics-card">
                    <span className="metrics-card__label">Running</span>
                    <strong className="text-info">{metrics.runningCount ?? 0}</strong>
                  </div>
                  <div className="metrics-card">
                    <span className="metrics-card__label">Success rate</span>
                    <strong className="text-success">{successRate}%</strong>
                  </div>
                  <div className="metrics-card">
                    <span className="metrics-card__label">Failed</span>
                    <strong className="text-danger">{metrics.failureCount ?? 0}</strong>
                  </div>
                  <div className="metrics-card">
                    <span className="metrics-card__label">DLQ</span>
                    <strong className="text-danger">{metrics.dlqCount ?? 0}</strong>
                  </div>
                  <div className="metrics-card">
                    <span className="metrics-card__label">Avg time</span>
                    <strong>{metrics.avgProcessingTimeMs ?? 0}ms</strong>
                  </div>
                </div>
              ) : (
                <p className="bottom-panel__empty">Loading metrics from dashboard API…</p>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="bottom-panel__table-wrap">
              <table className="bottom-panel__table">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {safeHistory.slice(0, 20).map((row) => (
                    <tr key={row.id}>
                      <td>{row.workflowId || row.routeId || row.id}</td>
                      <td><span className={`badge badge--${(row.status || '').toLowerCase()}`}>{row.status}</span></td>
                      <td>{row.startedAt ? new Date(row.startedAt).toLocaleString() : '-'}</td>
                      <td>{row.processingTimeMs != null ? `${row.processingTimeMs}ms` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {safeHistory.length === 0 && <p className="bottom-panel__empty">No workflow history</p>}
            </div>
          )}

          {tab === 'timeline' && (
            <div className="ncx-exec-timeline">
              {executionNodes.length === 0 && safeHistory.length === 0 && (
                <p className="bottom-panel__empty">Run workflow to see execution timeline</p>
              )}
              {executionNodes.map((n, i) => (
                <div key={n.id || i} className="ncx-exec-timeline__item">
                  <span className="ncx-exec-timeline__dot" />
                  <div>
                    <div className="ncx-table__name">{n.nodeKey}</div>
                    <div className="ncx-table__meta">
                      {n.status} · {n.processingTimeMs != null ? `${n.processingTimeMs}ms` : '—'}
                    </div>
                  </div>
                  <span className="ncx-table__meta">{formatTime(n.completedAt || n.startedAt)}</span>
                </div>
              ))}
              {executionNodes.length === 0 &&
                safeHistory.slice(0, 5).map((row) => (
                  <div key={row.id} className="ncx-exec-timeline__item">
                    <span className="ncx-exec-timeline__dot" />
                    <div>
                      <div className="ncx-table__name">{row.routeId || row.workflowId}</div>
                      <div className="ncx-table__meta">{row.status}</div>
                    </div>
                    <span className="ncx-table__meta">{formatTime(row.startedAt)}</span>
                  </div>
                ))}
            </div>
          )}

          {tab === 'retry' && (
            <div className="bottom-panel__logs">
              {retryItems.map((row) => (
                <div key={row.id} className="log-line">
                  <span className="log-level log-level--warn">[RETRY]</span>
                  <span className="log-msg">{row.workflowId || row.routeId} — retry in progress</span>
                  <span className="log-time">{formatTime(row.startedAt)}</span>
                </div>
              ))}
              {retryItems.length === 0 && <p className="bottom-panel__empty">Retry queue is empty</p>}
            </div>
          )}

          {tab === 'failed' && (
            <div className="bottom-panel__logs">
              {failedItems.map((row) => (
                <div key={row.id} className="log-line">
                  <span className="log-level log-level--error">[FAILED]</span>
                  <span className="log-msg">{row.errorMessage || row.workflowId || 'Execution failed'}</span>
                  <span className="log-time">{formatTime(row.completedAt || row.startedAt)}</span>
                </div>
              ))}
              {failedItems.length === 0 && <p className="bottom-panel__empty">No failed records</p>}
            </div>
          )}
        </div>
      )}
    </footer>
  );
}
