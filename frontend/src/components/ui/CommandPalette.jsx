import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  { id: 'dashboard', label: 'Go to Dashboard', group: 'Navigate', path: '/', shortcut: 'G D' },
  { id: 'workflows', label: 'Go to Workflows', group: 'Navigate', path: '/workflows', shortcut: 'G W' },
  { id: 'builder', label: 'Open Workflow Builder', group: 'Navigate', path: '/workflows/builder', shortcut: 'G B' },
  { id: 'monitoring', label: 'Open Monitoring', group: 'Navigate', path: '/monitoring', shortcut: 'G M' },
  { id: 'logs', label: 'Open Logs', group: 'Navigate', path: '/logs' },
  { id: 'alerts', label: 'Open Alerts Center', group: 'Navigate', path: '/alerts' },
  { id: 'schedules', label: 'Open Schedules', group: 'Navigate', path: '/schedules' },
  { id: 'connections', label: 'Manage Connections', group: 'Navigate', path: '/connections' },
  { id: 'environments', label: 'Deployment Context', group: 'Navigate', path: '/environments' },
  { id: 'versions', label: 'Workflow Versions', group: 'Navigate', path: '/versions' },
  { id: 'settings', label: 'Settings', group: 'Navigate', path: '/settings' },
  { id: 'profile', label: 'Profile', group: 'Navigate', path: '/profile' },
  { id: 'create-wf', label: 'Create New Workflow', group: 'Actions', path: '/workflows/builder' },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.path.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[activeIdx]) {
        e.preventDefault();
        navigate(filtered[activeIdx].path);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIdx, navigate, onClose]);

  if (!open) return null;

  const groups = [...new Set(filtered.map((c) => c.group))];

  return (
    <div className="ncx-cmd-overlay" role="presentation" onClick={onClose}>
      <div
        className="ncx-cmd"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ncx-cmd__input-wrap">
          <span className="ncx-cmd__icon">⌘</span>
          <input
            className="ncx-cmd__input"
            autoFocus
            placeholder="Search commands, pages, actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Command search"
          />
          <kbd className="ncx-cmd__hint">Esc</kbd>
        </div>
        <div className="ncx-cmd__list">
          {filtered.length === 0 && (
            <p className="ncx-cmd__empty">No matching commands</p>
          )}
          {groups.map((group) => (
            <div key={group}>
              <div className="ncx-cmd__group">{group}</div>
              {filtered
                .filter((c) => c.group === group)
                .map((cmd) => {
                  const idx = filtered.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      className={`ncx-cmd__item ${idx === activeIdx ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        navigate(cmd.path);
                        onClose();
                      }}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && <kbd>{cmd.shortcut}</kbd>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        <div className="ncx-cmd__footer">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { open, setOpen };
}
