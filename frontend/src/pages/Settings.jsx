import { useEffect, useState } from 'react';

import { getConfigurations, updateConfiguration } from '../api/client';

import PageHeader from '../components/ui/PageHeader';

import LoadingState from '../components/ui/LoadingState';



const SECTIONS = [

  { id: 'general', label: 'General' },

  { id: 'users', label: 'Users & Roles' },

  { id: 'environments', label: 'Environments' },

  { id: 'parameters', label: 'Global Parameters' },

  { id: 'security', label: 'Security' },

  { id: 'notifications', label: 'Notifications' },

  { id: 'audit', label: 'Audit Logs' },

];



export default function Settings() {

  const [section, setSection] = useState('general');

  const [configs, setConfigs] = useState([]);

  const [edits, setEdits] = useState({});

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState('');



  useEffect(() => {

    getConfigurations()

      .then((res) => {

        setConfigs(res.data || []);

        const initial = {};

        (res.data || []).forEach((c) => {

          initial[c.id] = c.configValue;

        });

        setEdits(initial);

      })

      .finally(() => setLoading(false));

  }, []);



  const handleSave = async (id) => {

    await updateConfiguration(id, edits[id]);

    setMessage('Configuration saved');

    setTimeout(() => setMessage(''), 3000);

  };



  if (loading) return <LoadingState message="Loading settings…" />;



  return (

    <>

      <PageHeader title="Settings" subtitle="Platform configuration, security, and governance" />



      {message && (

        <div

          style={{

            padding: '0.65rem 1rem',

            background: 'var(--ncx-success-soft)',

            color: 'var(--ncx-success)',

            borderRadius: '8px',

            marginBottom: '1rem',

            fontSize: '0.875rem',

          }}

        >

          {message}

        </div>

      )}



      <div className="ncx-settings-layout">

        <nav className="ncx-settings-nav">

          {SECTIONS.map((s) => (

            <button

              key={s.id}

              type="button"

              className={`ncx-settings-nav__item ${section === s.id ? 'active' : ''}`}

              onClick={() => setSection(s.id)}

            >

              {s.label}

            </button>

          ))}

        </nav>



        <div>

          {section === 'general' && (

            <section className="ncx-card">

              <div className="ncx-card__header">

                <h2 className="ncx-card__title">General Settings</h2>

              </div>

              <div className="ncx-card__body">

                <div className="form-group" style={{ marginBottom: '1rem' }}>

                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ncx-text-muted)', marginBottom: '0.35rem' }}>

                    Platform Name

                  </label>

                  <input className="ncx-input" defaultValue="Nexi ConnectX" style={{ width: '100%' }} />

                </div>

                <div className="form-group">

                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ncx-text-muted)', marginBottom: '0.35rem' }}>

                    Default Timezone

                  </label>

                  <select className="ncx-select" defaultValue="UTC">

                    <option>UTC</option>

                    <option>America/New_York</option>

                    <option>Asia/Kolkata</option>

                  </select>

                </div>

              </div>

            </section>

          )}



          {section === 'parameters' && (

            <section className="ncx-card">

              <div className="ncx-card__header">

                <h2 className="ncx-card__title">Global Parameters</h2>

              </div>

              <div className="ncx-card__body">

                {configs.map((config) => (

                  <div key={config.id} style={{ marginBottom: '1.25rem' }}>

                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ncx-text-muted)', marginBottom: '0.35rem' }}>

                      {config.configKey}{' '}

                      <span className="ncx-badge ncx-badge--neutral">{config.category}</span>

                    </label>

                    <input

                      className="ncx-input"

                      style={{ width: '100%' }}

                      value={edits[config.id] ?? ''}

                      onChange={(e) => setEdits({ ...edits, [config.id]: e.target.value })}

                    />

                    <button

                      type="button"

                      className="ncx-btn ncx-btn--primary ncx-btn--sm"

                      style={{ marginTop: '0.5rem' }}

                      onClick={() => handleSave(config.id)}

                    >

                      Save

                    </button>

                  </div>

                ))}

                {configs.length === 0 && <p className="ncx-table__meta">No parameters configured</p>}

              </div>

            </section>

          )}



          {section !== 'general' && section !== 'parameters' && (

            <section className="ncx-card">

              <div className="ncx-card__header">

                <h2 className="ncx-card__title">{SECTIONS.find((s) => s.id === section)?.label}</h2>

              </div>

              <div className="ncx-card__body">

                <p className="ncx-table__meta">

                  {section === 'users' && 'Manage RBAC roles, SSO, and team access.'}

                  {section === 'environments' && 'Configure production, staging, and development environments.'}

                  {section === 'security' && 'API keys, encryption, and audit policies.'}

                  {section === 'notifications' && 'Email, Slack, and webhook notification rules.'}

                  {section === 'audit' && 'Immutable audit trail of configuration changes.'}

                </p>

                <button type="button" className="ncx-btn ncx-btn--secondary ncx-btn--sm" style={{ marginTop: '1rem' }}>

                  Configure (coming soon)

                </button>

              </div>

            </section>

          )}

        </div>

      </div>

    </>

  );

}

