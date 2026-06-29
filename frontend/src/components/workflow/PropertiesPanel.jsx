import { useState, useEffect } from 'react';
import { parseConfig, stringifyConfig } from './workflowUtils';

const TABS = [
  { id: 'params',   label: 'Parameters' },
  { id: 'retry',    label: 'Retry' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'logs',     label: 'Logs' },
  { id: 'json',     label: 'JSON' },
];

/* ── Key-Value pair editor ─────────────────────────────────────────────── */
function KeyValueEditor({ value, onChange, placeholder }) {
  // Parse incoming JSON string → array of [key, val] pairs for local state
  const parseEntries = (v) => {
    try {
      const obj = v ? JSON.parse(v) : {};
      return Object.entries(obj);
    } catch {
      return [];
    }
  };

  const [entries, setEntries] = useState(() => parseEntries(value));

  // Sync when parent value changes externally (e.g. node switch)
  useEffect(() => {
    setEntries(parseEntries(value));
  }, [value]);

  // Push non-empty entries up to parent as JSON string
  const syncParent = (newEntries) => {
    const obj = {};
    newEntries.forEach(([k, v]) => {
      if (k.trim()) obj[k.trim()] = v;
    });
    onChange(JSON.stringify(obj));
  };

  const addEntry = () => {
    // Add empty row locally — do NOT filter here
    setEntries((prev) => [...prev, ['', '']]);
  };

  const updateEntry = (idx, key, val) => {
    setEntries((prev) => {
      const next = prev.map((e, i) => (i === idx ? [key, val] : e));
      syncParent(next);
      return next;
    });
  };

  const removeEntry = (idx) => {
    setEntries((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      syncParent(next);
      return next;
    });
  };

  return (
    <div className="kv-editor">
      {entries.map(([k, v], i) => (
        <div key={i} className="kv-row">
          <input
            className="kv-key"
            value={k}
            placeholder="JSON field"
            onChange={(e) => updateEntry(i, e.target.value, v)}
          />
          <span className="kv-arrow">→</span>
          <input
            className="kv-val"
            value={v}
            placeholder="DB column"
            onChange={(e) => updateEntry(i, k, e.target.value)}
          />
          <button type="button" className="kv-remove" onClick={() => removeEntry(i)}>✕</button>
        </div>
      ))}
      <button type="button" className="kv-add" onClick={addEntry}>+ Add mapping</button>
      {placeholder && entries.length === 0 && (
        <p className="prop-hint">{placeholder}</p>
      )}
    </div>
  );
}

/* ── Single field renderer ─────────────────────────────────────────────── */
function FieldInput({ fieldSchema, value, onChange }) {
  const { key, label, type, required, options, placeholder, defaultValue } = fieldSchema;
  const effectiveValue = value !== undefined && value !== null ? value : (defaultValue ?? '');

  switch (type) {
    case 'checkbox':
      return (
        <div className="prop-field prop-field--checkbox">
          <label>
            <input
              type="checkbox"
              checked={String(effectiveValue) === 'true'}
              onChange={(e) => onChange(String(e.target.checked))}
            />
            {label}{required && <span className="req">*</span>}
          </label>
        </div>
      );

    case 'select':
      return (
        <div className="prop-field">
          <label>{label}{required && <span className="req">*</span>}</label>
          <select value={effectiveValue} onChange={(e) => onChange(e.target.value)}>
            {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );

    case 'textarea':
      return (
        <div className="prop-field">
          <label>{label}{required && <span className="req">*</span>}</label>
          <textarea
            rows={3}
            value={effectiveValue}
            placeholder={placeholder || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case 'password':
      return (
        <div className="prop-field">
          <label>{label}{required && <span className="req">*</span>}</label>
          <input
            type="password"
            value={effectiveValue}
            placeholder={placeholder || ''}
            autoComplete="new-password"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case 'number':
      return (
        <div className="prop-field">
          <label>{label}{required && <span className="req">*</span>}</label>
          <input
            type="number"
            value={effectiveValue}
            placeholder={placeholder || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case 'keyvalue':
      return (
        <div className="prop-field">
          <label>{label}{required && <span className="req">*</span>}</label>
          <KeyValueEditor
            value={effectiveValue}
            onChange={onChange}
            placeholder={placeholder}
          />
        </div>
      );

    default: // text
      return (
        <div className="prop-field">
          <label>{label}{required && <span className="req">*</span>}</label>
          <input
            type="text"
            value={effectiveValue}
            placeholder={placeholder || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}

/* ── Grouped schema form ───────────────────────────────────────────────── */
function SchemaForm({ schema, config, onFieldChange }) {
  // Group fields by their "group" property
  const groups = [];
  const seen = new Set();
  (schema || []).forEach((f) => {
    if (!seen.has(f.group)) { seen.add(f.group); groups.push(f.group); }
  });

  return (
    <div className="schema-form">
      {groups.map((group) => (
        <fieldset key={group} className="schema-group">
          <legend className="schema-group__legend">{group}</legend>
          {schema.filter((f) => f.group === group).map((f) => (
            <FieldInput
              key={f.key}
              fieldSchema={f}
              value={config[f.key]}
              onChange={(val) => onFieldChange(f.key, val)}
            />
          ))}
        </fieldset>
      ))}
      {(!schema || schema.length === 0) && (
        <p className="prop-hint">No configuration parameters for this plugin.</p>
      )}
    </div>
  );
}

/* ── Workflow-level settings (no node selected / workflow mode) ───────── */
function WorkflowSettings({
  form,
  flowNodes,
  triggerNodeKey,
  lastExecution,
  onFormChange,
  onSetTrigger,
}) {
  return (
    <div className="properties-panel__workflow">
      <p className="properties-panel__hint">
        Double-click a task on the canvas to edit its plugin settings.
      </p>
      <div className="prop-field">
        <label>Display name</label>
        <input
          value={form.name || ''}
          onChange={(e) => onFormChange({ name: e.target.value })}
        />
      </div>
      <div className="prop-field">
        <label>Workflow code</label>
        <input value={form.code || ''} disabled title="Set at creation" />
      </div>
      <div className="prop-field">
        <label>Description</label>
        <textarea
          rows={2}
          value={form.description || ''}
          onChange={(e) => onFormChange({ description: e.target.value })}
          placeholder="Optional description"
        />
      </div>
      <div className="prop-field">
        <label>Status</label>
        <span className={`badge ${form.status === 'ACTIVE' ? 'success' : 'neutral'}`}>{form.status}</span>
      </div>
      <div className="prop-field">
        <label>Entry trigger node</label>
        <select
          value={triggerNodeKey || ''}
          onChange={(e) => onSetTrigger(e.target.value)}
        >
          <option value="">— Select trigger —</option>
          {flowNodes.map((n) => (
            <option key={n.id} value={n.id}>{n.data?.label || n.id}</option>
          ))}
        </select>
      </div>
      {lastExecution?.executionId && (
        <div className="prop-field">
          <label>Last run</label>
          <p className="prop-hint" style={{ margin: 0 }}>
            Execution {String(lastExecution.executionId).slice(0, 8)}…
            {lastExecution.nodes?.length != null && ` · ${lastExecution.nodes.length} node(s)`}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main PropertiesPanel ──────────────────────────────────────────────── */
export default function PropertiesPanel({
  propertiesMode = 'workflow',
  form,
  flowNodes = [],
  lastExecution,
  onFormChange,
  selectedNode,
  plugin,
  triggerNodeKey,
  onUpdateNode,
  onSetTrigger,
  onDeleteNode,
  nodeExecutionLog = [],
  panelRef,
}) {
  const [tab, setTab] = useState('params');

  useEffect(() => {
    if (selectedNode?.id) setTab('params');
  }, [selectedNode?.id]);

  const showNodeEditor = propertiesMode === 'node' && selectedNode;

  if (!showNodeEditor) {
    return (
      <aside className="properties-panel" ref={panelRef}>
        <h2 className="properties-panel__title">Workflow settings</h2>
        {form ? (
          <WorkflowSettings
            form={form}
            flowNodes={flowNodes}
            triggerNodeKey={triggerNodeKey}
            lastExecution={lastExecution}
            onFormChange={onFormChange}
            onSetTrigger={onSetTrigger}
          />
        ) : (
          <p className="properties-panel__empty">Create or open a workflow to begin.</p>
        )}
      </aside>
    );
  }

  const config = parseConfig(selectedNode.data.configJson);
  const retry    = config._retry    || {};
  const schedule = config._schedule || {};

  const schema = plugin?.configSchema || [];

  const setField = (key, value) => {
    onUpdateNode(selectedNode.id, {
      configJson: stringifyConfig({ ...config, [key]: value }),
    });
  };

  const setNested = (section, patch) => {
    onUpdateNode(selectedNode.id, {
      configJson: stringifyConfig({ ...config, [section]: { ...config[section], ...patch } }),
    });
  };

  const setData = (patch) => onUpdateNode(selectedNode.id, patch);

  const categoryLabel = selectedNode.data?.group || plugin?.category || 'Task';

  return (
    <aside className="properties-panel properties-panel--node" ref={panelRef}>
      <h2 className="properties-panel__title">{selectedNode.data.label} — Properties</h2>
      <div className="properties-panel__subtitle">
        <span className="properties-panel__badge">{categoryLabel}</span>
        {plugin?.description && <span className="properties-panel__desc">{plugin.description}</span>}
      </div>

      <div className="prop-field">
        <label>Node name</label>
        <input value={selectedNode.data.label} onChange={(e) => setData({ label: e.target.value })} />
      </div>

      <div className="prop-field">
        <label>Plugin type</label>
        <input value={selectedNode.data.pluginName} disabled />
      </div>

      {/* Tabs */}
      <div className="prop-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`prop-tabs__btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="prop-tab-content">

        {/* ── Parameters tab: full configSchema form ── */}
        {tab === 'params' && (
          <>
            <div className="prop-field prop-field--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={triggerNodeKey === selectedNode.id}
                  onChange={(e) => onSetTrigger(e.target.checked ? selectedNode.id : '')}
                />
                Entry trigger node
              </label>
            </div>

            <SchemaForm
              schema={schema}
              config={config}
              onFieldChange={setField}
            />
          </>
        )}

        {/* ── Retry tab ── */}
        {tab === 'retry' && (
          <>
            <div className="prop-field">
              <label>Max retry attempts</label>
              <input
                type="number" min={0}
                value={retry.maxAttempts ?? 3}
                onChange={(e) => setNested('_retry', { maxAttempts: Number(e.target.value) })}
              />
            </div>
            <div className="prop-field">
              <label>Retry delay (ms)</label>
              <input
                type="number" min={0}
                value={retry.delayMs ?? 2000}
                onChange={(e) => setNested('_retry', { delayMs: Number(e.target.value) })}
              />
            </div>
            <div className="prop-field prop-field--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={retry.sendToDlq ?? false}
                  onChange={(e) => setNested('_retry', { sendToDlq: e.target.checked })}
                />
                Send to DLQ on failure
              </label>
            </div>
          </>
        )}

        {/* ── Schedule tab ── */}
        {tab === 'schedule' && (
          <>
            <div className="prop-field">
              <label>Cron expression</label>
              <input
                value={schedule.cron || ''}
                onChange={(e) => setNested('_schedule', { cron: e.target.value })}
                placeholder="0 0 * * * ?"
              />
            </div>
            <div className="prop-field">
              <label>Polling interval (seconds)</label>
              <input
                type="number"
                value={schedule.pollingIntervalSec || ''}
                onChange={(e) => setNested('_schedule', { pollingIntervalSec: Number(e.target.value) })}
                placeholder="60"
              />
            </div>
            <p className="prop-hint">Scheduling requires Camel Quartz route (roadmap)</p>
          </>
        )}

        {/* ── Logs tab ── */}
        {tab === 'logs' && (
          <div className="prop-logs">
            {nodeExecutionLog.length === 0 && (
              <p className="prop-hint">No execution logs for this node yet. Run the workflow to populate.</p>
            )}
            {nodeExecutionLog.map((entry, i) => (
              <div key={entry.id || i} className="prop-log-line">
                <span className={`log-level log-level--${(entry.status || 'info').toLowerCase()}`}>
                  [{entry.status || 'INFO'}]
                </span>
                <span>{entry.errorMessage || `Completed in ${entry.processingTimeMs ?? '?'}ms`}</span>
                <span className="log-time">
                  {entry.completedAt ? new Date(entry.completedAt).toLocaleTimeString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Raw JSON tab ── */}
        {tab === 'json' && (
          <div className="prop-field">
            <label>Full configuration (JSON)</label>
            <textarea
              rows={14}
              className="prop-json-editor"
              value={selectedNode.data.configJson || '{}'}
              onChange={(e) => setData({ configJson: e.target.value })}
              spellCheck={false}
            />
            {(() => {
              try { JSON.parse(selectedNode.data.configJson || '{}'); return null; }
              catch { return <p className="prop-error">Invalid JSON syntax</p>; }
            })()}
          </div>
        )}
      </div>

      <div className="properties-panel__actions">
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteNode(selectedNode.id)}>
          Delete task
        </button>
      </div>
    </aside>
  );
}
