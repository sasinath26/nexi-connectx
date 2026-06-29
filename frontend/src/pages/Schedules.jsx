import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';

const MOCK_SCHEDULES = [
  {
    id: 1,
    name: 'Daily ETL — Employees',
    cron: '0 2 * * *',
    workflow: 'employees-csv-db',
    status: 'ACTIVE',
    nextRun: '2026-05-27T02:00:00',
    lastRun: '2026-05-26T02:00:00',
    retries: 3,
  },
  {
    id: 2,
    name: 'Hourly API Sync',
    cron: '0 * * * *',
    workflow: 'api-sync-pipeline',
    status: 'ACTIVE',
    nextRun: '2026-05-26T15:00:00',
    lastRun: '2026-05-26T14:00:00',
    retries: 2,
  },
  {
    id: 3,
    name: 'Weekly Report',
    cron: '0 8 * * 1',
    workflow: 'weekly-report',
    status: 'DRAFT',
    nextRun: '2026-06-02T08:00:00',
    lastRun: null,
    retries: 1,
  },
];

const CAL_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export default function Schedules() {
  const [view, setView] = useState('list');

  return (
    <>
      <PageHeader
        title="Schedules"
        subtitle="Cron schedules, triggers, and execution previews"
        actions={
          <>
            <button
              type="button"
              className={`ncx-btn ncx-btn--sm ${view === 'list' ? 'ncx-btn--primary' : 'ncx-btn--secondary'}`}
              onClick={() => setView('list')}
            >
              List
            </button>
            <button
              type="button"
              className={`ncx-btn ncx-btn--sm ${view === 'calendar' ? 'ncx-btn--primary' : 'ncx-btn--secondary'}`}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
            <button type="button" className="ncx-btn ncx-btn--primary">
              + New Schedule
            </button>
          </>
        }
      />

      {view === 'calendar' ? (
        <section className="ncx-card">
          <div className="ncx-card__header">
            <h2 className="ncx-card__title">May 2026</h2>
          </div>
          <div className="ncx-card__body">
            <div className="ncx-calendar">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                <div key={d} className="ncx-calendar__day" style={{ fontWeight: 600 }}>
                  {d}
                </div>
              ))}
              {CAL_DAYS.map((d) => (
                <div
                  key={d}
                  className={`ncx-calendar__day ${d === 26 ? 'ncx-calendar__day--active' : ''} ${[2, 8, 15, 22].includes(d) ? 'ncx-calendar__day--run' : ''}`}
                >
                  {d}
                </div>
              ))}
            </div>
            <p className="ncx-table__meta" style={{ marginTop: '1rem' }}>
              Green = scheduled run · Blue = today
            </p>
          </div>
        </section>
      ) : (
        <section className="ncx-card">
          <div className="ncx-card__body ncx-card__body--flush">
            <div className="ncx-table-wrap">
              <table className="ncx-table">
                <thead>
                  <tr>
                    <th>Schedule</th>
                    <th>Cron</th>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th>Next Run</th>
                    <th>Retries</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SCHEDULES.map((s) => (
                    <tr key={s.id}>
                      <td className="ncx-table__name">{s.name}</td>
                      <td>
                        <code style={{ fontSize: '0.8rem' }}>{s.cron}</code>
                      </td>
                      <td className="ncx-table__meta">{s.workflow}</td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="ncx-table__meta">
                        {s.nextRun ? new Date(s.nextRun).toLocaleString() : '—'}
                      </td>
                      <td>{s.retries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="ncx-card" style={{ marginTop: '1.25rem' }}>
        <div className="ncx-card__header">
          <h2 className="ncx-card__title">Trigger History</h2>
        </div>
        <div className="ncx-card__body">
          <p className="ncx-table__meta">
            Connect backend schedule API to show cron trigger history and retry settings.
          </p>
        </div>
      </section>
    </>
  );
}
