import { useEffect, useState } from 'react';
import { getConfigurations, updateConfiguration, triggerWorkflow } from '../api/client';

export default function PluginConfiguration() {
  const [configs, setConfigs] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = () => {
    getConfigurations()
      .then((res) => {
        setConfigs(res.data);
        const initial = {};
        res.data.forEach((c) => { initial[c.id] = c.configValue; });
        setEdits(initial);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (id) => {
    await updateConfiguration(id, edits[id]);
    setMessage('Configuration saved');
    load();
    setTimeout(() => setMessage(''), 3000);
  };

  const handleTrigger = async () => {
    const sample = [{ id: '1', name: 'Test User', email: 'test@example.com', type: 'GENERAL', source: 'REST' }];
    await triggerWorkflow(sample);
    setMessage('Workflow triggered via REST');
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return <p className="loading">Loading configuration...</p>;

  return (
    <>
      <h1 className="page-title">Plugin Configuration</h1>
      {message && <p style={{ color: 'var(--success)', marginBottom: '1rem' }}>{message}</p>}

      <section className="card">
        <h2>Integration Settings</h2>
        {configs.map((config) => (
          <section key={config.id} className="form-group">
            <label>{config.configKey} ({config.category})</label>
            <input
              value={edits[config.id] ?? ''}
              onChange={(e) => setEdits({ ...edits, [config.id]: e.target.value })}
            />
            <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => handleSave(config.id)}>
              Save
            </button>
          </section>
        ))}
      </section>

      <section className="card">
        <h2>Manual Workflow Trigger</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Trigger the REST integration pipeline with sample JSON payload.
        </p>
        <button className="btn btn-primary" onClick={handleTrigger}>Trigger Workflow</button>
      </section>
    </>
  );
}
