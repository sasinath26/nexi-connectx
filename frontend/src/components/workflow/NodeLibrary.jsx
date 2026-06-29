import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PALETTE_CATEGORIES, paletteCategory, getPluginIcon } from './workflowUtils';

const CATEGORY_ICONS = {
  'Source Connectors': '⬇',
  'Processing Tasks': '⚙',
  Validation: '✓',
  'Flow Control': '⑂',
  Messaging: '📨',
  Database: '▣',
  Notifications: '✉',
  Monitoring: '📊',
};

const CATEGORY_LABELS = {
  'Source Connectors': 'Sources',
  'Processing Tasks': 'Transformations',
  Validation: 'Validations',
  'Flow Control': 'Flow Control',
  Database: 'Databases',
  Messaging: 'Utilities',
  Notifications: 'Notifications',
  Monitoring: 'Monitoring',
};

const MONITORING_LINKS = [
  { to: '/monitoring', label: 'Metrics & route health', icon: '📈' },
  { to: '/monitoring', label: 'Health check', icon: '❤' },
  { to: '/logs', label: 'Execution logs', icon: '📋' },
];

export default function NodeLibrary({ plugins, onAddPlugin, collapsed: paletteCollapsed }) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [dragPreview, setDragPreview] = useState(null);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = plugins.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
    const map = {};
    filtered.forEach((p) => {
      const cat = paletteCategory(p);
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return PALETTE_CATEGORIES.filter((c) => map[c]?.length).map((c) => [c, map[c]]);
  }, [plugins, query]);

  const toggleCategory = (category) => {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const isCollapsed = (category) => collapsed[category] === true;

  const onDragStart = (event, plugin) => {
    event.dataTransfer.setData('application/reactflow-plugin', JSON.stringify(plugin));
    event.dataTransfer.effectAllowed = 'move';
    setDragPreview(plugin.name);
  };

  const onDragEnd = () => setDragPreview(null);

  return (
    <aside className={`node-library ${paletteCollapsed ? 'node-library--collapsed' : ''}`}>
      <h2 className="node-library__title">{paletteCollapsed ? '◇' : 'Task palette'}</h2>
      {!paletteCollapsed && (
      <input
        type="search"
        className="node-library__search"
        placeholder="Filter tasks…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      )}

      {dragPreview && (
        <div className="node-library__drag-preview">
          <span>Dragging:</span> {dragPreview}
        </div>
      )}

      <div className="node-library__list">
        {grouped.map(([category, items]) => (
          <section key={category} className="node-library__section">
            <button
              type="button"
              className="node-library__section-title node-library__section-toggle"
              onClick={() => toggleCategory(category)}
              aria-expanded={!isCollapsed(category)}
            >
              <span className="node-library__chevron">{isCollapsed(category) ? '▸' : '▾'}</span>
              <span className="node-library__icon">{CATEGORY_ICONS[category]}</span>
              {CATEGORY_LABELS[category] || category}
              <span className="node-library__count">{items.length}</span>
            </button>
            {!paletteCollapsed && !isCollapsed(category) &&
              items.map((plugin) => (
                <button
                  key={plugin.type}
                  type="button"
                  className="node-library__item"
                  draggable
                  onDragStart={(e) => onDragStart(e, plugin)}
                  onDragEnd={onDragEnd}
                  onClick={() => onAddPlugin(plugin)}
                  title={plugin.description}
                >
                  <span className="node-library__item-icon">{getPluginIcon(plugin)}</span>
                  <span className="node-library__item-text">
                    <span className="node-library__item-name">{plugin.name}</span>
                    <span className="node-library__item-desc">{plugin.description}</span>
                  </span>
                </button>
              ))}
          </section>
        ))}

        <section className="node-library__section">
          <button
            type="button"
            className="node-library__section-title node-library__section-toggle"
            onClick={() => toggleCategory('Monitoring')}
            aria-expanded={!isCollapsed('Monitoring')}
          >
            <span className="node-library__chevron">{isCollapsed('Monitoring') ? '▸' : '▾'}</span>
            <span className="node-library__icon">{CATEGORY_ICONS.Monitoring}</span>
            Monitoring
          </button>
          {!isCollapsed('Monitoring') &&
            MONITORING_LINKS.map((link) => (
              <Link key={link.label} to={link.to} className="node-library__link">
                <span>{link.icon}</span> {link.label}
              </Link>
            ))}
        </section>

        {grouped.length === 0 && query && (
          <p className="node-library__empty">No tasks match your search</p>
        )}
        {grouped.length === 0 && !query && (
          <div className="node-library__empty" style={{ padding: '16px', textAlign: 'center', color: '#ef4444' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
            <strong>No plugins loaded</strong>
            <p style={{ fontSize: '12px', marginTop: '6px', color: '#94a3b8' }}>
              Backend may not be running.<br />
              Start the Spring Boot server on port 8080.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
