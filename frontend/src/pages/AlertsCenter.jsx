import { useEffect, useState } from 'react';

import { getWorkflowHistory } from '../api/client';

import PageHeader from '../components/ui/PageHeader';

import LoadingState from '../components/ui/LoadingState';



const INTEGRATIONS = [

  { name: 'Slack', status: 'connected', channel: '#workflow-alerts' },

  { name: 'Email', status: 'connected', channel: 'ops@company.com' },

  { name: 'PagerDuty', status: 'disconnected', channel: '—' },

];



export default function AlertsCenter() {

  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('ALL');



  useEffect(() => {

    getWorkflowHistory()

      .then((res) => {

        const hist = Array.isArray(res.data) ? res.data : [];

        const mapped = hist

          .filter((h) => ['FAILED', 'RETRYING', 'DLQ', 'SUCCESS'].includes(h.status))

          .slice(0, 30)

          .map((h) => ({

            id: h.id,

            type:

              h.status === 'FAILED' || h.status === 'DLQ'

                ? 'error'

                : h.status === 'RETRYING'

                  ? 'warn'

                  : h.status === 'SUCCESS'

                    ? 'ok'

                    : 'info',

            title:

              h.status === 'FAILED'

                ? `Workflow failed: ${h.routeId}`

                : h.status === 'SUCCESS'

                  ? `Workflow succeeded: ${h.routeId}`

                  : `Workflow ${h.status}: ${h.routeId}`,

            message: h.errorMessage || `Processing time ${h.processingTimeMs ?? 0}ms`,

            time: h.startedAt,

          }));

        setAlerts(mapped);

      })

      .finally(() => setLoading(false));

  }, []);



  const filtered =

    filter === 'ALL' ? alerts : alerts.filter((a) => a.type === filter.toLowerCase());



  if (loading) return <LoadingState message="Loading alerts…" />;



  return (

    <>

      <PageHeader

        title="Alerts Center"

        subtitle="Failure alerts, warnings, retries, and notification channels"

        environmentPrefix="Alerts for deployment"

      />



      <section className="ncx-metrics" style={{ marginBottom: '1.25rem' }}>

        <article className="ncx-metric ncx-metric--danger">

          <p className="ncx-metric__label">Failures</p>

          <p className="ncx-metric__value">{alerts.filter((a) => a.type === 'error').length}</p>

        </article>

        <article className="ncx-metric ncx-metric--warning">

          <p className="ncx-metric__label">Warnings</p>

          <p className="ncx-metric__value">{alerts.filter((a) => a.type === 'warn').length}</p>

        </article>

        <article className="ncx-metric ncx-metric--success">

          <p className="ncx-metric__label">Success</p>

          <p className="ncx-metric__value">{alerts.filter((a) => a.type === 'ok').length}</p>

        </article>

      </section>



      <div className="ncx-grid-2">

        <section className="ncx-card">

          <div className="ncx-card__header">

            <h2 className="ncx-card__title">Notifications</h2>

            <div style={{ display: 'flex', gap: '0.35rem' }}>

              {['ALL', 'error', 'warn', 'ok'].map((f) => (

                <button

                  key={f}

                  type="button"

                  className={`ncx-btn ncx-btn--sm ${filter === f ? 'ncx-btn--primary' : 'ncx-btn--ghost'}`}

                  onClick={() => setFilter(f)}

                >

                  {f}

                </button>

              ))}

            </div>

          </div>

          <div className="ncx-card__body ncx-card__body--flush">

            {filtered.length === 0 ? (

              <p className="ncx-empty">No alerts</p>

            ) : (

              filtered.map((a) => (

                <div key={a.id} className="ncx-alert-item">

                  <div className={`ncx-alert-item__icon ncx-alert-item__icon--${a.type === 'ok' ? 'ok' : a.type}`}>

                    {a.type === 'error' ? '✕' : a.type === 'warn' ? '!' : '✓'}

                  </div>

                  <div style={{ flex: 1 }}>

                    <div className="ncx-table__name">{a.title}</div>

                    <div className="ncx-table__meta">{a.message}</div>

                    <div className="ncx-table__meta" style={{ marginTop: '0.25rem' }}>

                      {a.time ? new Date(a.time).toLocaleString() : ''}

                    </div>

                  </div>

                </div>

              ))

            )}

          </div>

        </section>



        <section className="ncx-card">

          <div className="ncx-card__header">

            <h2 className="ncx-card__title">Integrations</h2>

          </div>

          <div className="ncx-card__body">

            {INTEGRATIONS.map((int) => (

              <div

                key={int.name}

                style={{

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'center',

                  padding: '0.65rem 0',

                  borderBottom: '1px solid #f3f4f6',

                }}

              >

                <div>

                  <div className="ncx-table__name">{int.name}</div>

                  <div className="ncx-table__meta">{int.channel}</div>

                </div>

                <span

                  className={`ncx-badge ncx-badge--${int.status === 'connected' ? 'success' : 'neutral'}`}

                >

                  {int.status}

                </span>

              </div>

            ))}

          </div>

        </section>

      </div>

    </>

  );

}

