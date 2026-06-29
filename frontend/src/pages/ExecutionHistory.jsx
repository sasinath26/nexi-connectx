import { useEffect, useState } from 'react';
import { getWorkflowHistory } from '../api/client';

function StatusBadge({ status }) {
  const map = {
    SUCCESS: 'success',
    FAILED: 'danger',
    RUNNING: 'info',
    RETRYING: 'warning',
    DLQ: 'danger',
  };
  return <span className={`badge ${map[status] || 'neutral'}`}>{status}</span>;
}

export default function ExecutionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      getWorkflowHistory()
        .then((res) => setHistory(res.data))
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="loading">Loading execution history...</p>;

  return (
    <>
      <h1 className="page-title">Execution History</h1>

      <section className="card">
        <h2>Workflow Executions</h2>
        <table>
          <thead>
            <tr>
              <th>Workflow ID</th>
              <th>Route</th>
              <th>Source</th>
              <th>Status</th>
              <th>Retries</th>
              <th>Processing Time</th>
              <th>Started</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td style={{ fontSize: '0.75rem' }}>{item.workflowId?.substring(0, 8)}...</td>
                <td>{item.routeId}</td>
                <td>{item.sourceType}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>{item.retryCount ?? 0}</td>
                <td>{item.processingTimeMs ? `${item.processingTimeMs}ms` : '-'}</td>
                <td>{item.startedAt ? new Date(item.startedAt).toLocaleString() : '-'}</td>
                <td style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{item.errorMessage ?? '-'}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={8}>No executions yet. Drop a file in data/input or trigger via REST.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
