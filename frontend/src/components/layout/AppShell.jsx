import { NavLink, useLocation } from 'react-router-dom';
import { usePlatformEnvironment } from '../../context/PlatformEnvironmentContext';
import CommandPalette, { useCommandPalette } from '../ui/CommandPalette';
import EnvironmentBadge from '../ui/EnvironmentBadge';
import EnvironmentBanner from './EnvironmentBanner';

const MAIN_NAV = [
  { to: '/', label: 'Dashboard', icon: '◫', end: true },
  { to: '/workflows', label: 'Workflows', icon: '◇' },
  { to: '/workflows/builder', label: 'Workflow Builder', icon: '⊞' },
  { to: '/versions', label: 'Versions', icon: '⎇' },
];

const OPS_NAV = [
  { to: '/monitoring', label: 'Monitoring', icon: '◎' },
  { to: '/logs', label: 'Logs', icon: '≡' },
  { to: '/schedules', label: 'Schedules', icon: '◷' },
  { to: '/alerts', label: 'Alerts', icon: '⚠' },
];

const CONFIG_NAV = [
  { to: '/connections', label: 'Connections', icon: '⬡' },
  { to: '/environments', label: 'Deployment', icon: '◉' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

function NavSection({ title, items }) {
  return (
    <>
      <div className="app-sidebar__section">{title}</div>
      {items.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `app-side-link ${isActive ? 'active' : ''}`}
        >
          <span className="app-side-link__icon" aria-hidden>
            {icon}
          </span>
          {label}
        </NavLink>
      ))}
    </>
  );
}

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const isWorkflowBuilder = pathname.startsWith('/workflows/builder');
  const { open, setOpen } = useCommandPalette();
  const { environment, profile, loading } = usePlatformEnvironment();
  const envClass = profile ? `app-shell--env-${profile.toLowerCase()}` : '';

  return (
    <div
      className={`app-shell app-shell--enterprise ${envClass} ${
        isWorkflowBuilder ? 'app-shell--workflow-light' : ''
      }`}
    >
      <CommandPalette open={open} onClose={() => setOpen(false)} />
      <EnvironmentBanner />

      {!isWorkflowBuilder && (
        <aside className="app-sidebar">
          <div className="app-sidebar__brand">
            <span className="app-sidebar__logo">NX</span>
            <div>
              <div className="app-sidebar__name">Nexi ConnectX</div>
              <div className="app-sidebar__tag">Workflow Platform</div>
            </div>
          </div>
          <nav className="app-sidebar__nav">
            <NavSection title="Platform" items={MAIN_NAV} />
            <NavSection title="Operations" items={OPS_NAV} />
            <NavSection title="Configuration" items={CONFIG_NAV} />
          </nav>
          <div className="app-sidebar__footer">
            {!loading && (
              <div className="app-sidebar__env">
                <span className="app-sidebar__env-label">Deployment</span>
                <EnvironmentBadge env={environment} />
              </div>
            )}
            <button type="button" className="ncx-cmd-trigger" onClick={() => setOpen(true)}>
              ⌘ Command palette
              <kbd>Ctrl K</kbd>
            </button>
          </div>
        </aside>
      )}

      <div className="app-frame">
        {!isWorkflowBuilder && (
          <header className="app-topbar">
            <div className="app-topbar__left">
              <span className="app-topbar__product">Nexi ConnectX</span>
              <button
                type="button"
                className="ncx-cmd-trigger ncx-cmd-trigger--bar"
                onClick={() => setOpen(true)}
              >
                ⌕ Search…
                <kbd>Ctrl K</kbd>
              </button>
            </div>
            <div className="app-topbar__center">
              {!loading && <EnvironmentBadge env={environment} />}
            </div>
            <div className="app-topbar__actions">
              <NavLink to="/alerts" className="app-topbar__icon-btn" title="Alerts">
                ⚠
              </NavLink>
              <NavLink to="/monitoring" className="app-topbar__icon-btn" title="Monitoring">
                ◎
              </NavLink>
              <NavLink to="/profile" className="app-topbar__profile" title="Profile">
                <span className="app-topbar__avatar">SA</span>
                <span>Admin</span>
              </NavLink>
            </div>
          </header>
        )}

        {isWorkflowBuilder && (
          <header className="app-header app-header--builder-minimal">
            <div className="app-header__brand">
              <NavLink to="/" className="app-header__logo-link">
                <span className="app-header__logo">NX</span>
              </NavLink>
              <span className="app-header__name">Nexi ConnectX</span>
              {!loading && <EnvironmentBadge env={environment} />}
            </div>
            <nav className="app-header__nav">
              <NavLink to="/workflows" className="app-nav-link">
                ← Workflows
              </NavLink>
              <NavLink to="/workflows/builder" className="app-nav-link active">
                Builder
              </NavLink>
              <NavLink to="/monitoring" className="app-nav-link">
                Monitoring
              </NavLink>
            </nav>
            <div className="app-header__right">
              <button
                type="button"
                className="ncx-cmd-trigger ncx-cmd-trigger--compact"
                onClick={() => setOpen(true)}
              >
                ⌘K
              </button>
              <NavLink to="/profile" className="app-header__profile">
                Profile
              </NavLink>
            </div>
          </header>
        )}

        <main className={`app-main ${isWorkflowBuilder ? '' : 'app-main--enterprise'}`}>{children}</main>
      </div>
    </div>
  );
}
