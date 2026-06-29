export default function SettingsDrawer({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <>
      <button type="button" className="wf-drawer-backdrop" aria-label="Close panel" onClick={onClose} />
      <aside className="wf-drawer" role="dialog" aria-labelledby="wf-drawer-title">
        <header className="wf-drawer__header">
          <h2 id="wf-drawer-title" className="wf-drawer__title">{title}</h2>
          <button type="button" className="wf-drawer__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="wf-drawer__body">{children}</div>
      </aside>
    </>
  );
}
