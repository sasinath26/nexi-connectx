import PageEnvironmentContext from './PageEnvironmentContext';

export default function PageHeader({
  title,
  subtitle,
  actions,
  children,
  showEnvironment = true,
  environmentPrefix = 'Environment',
}) {
  return (
    <header className="ncx-page-header">
      <div>
        <h1 className="ncx-page-header__title">{title}</h1>
        {subtitle && <p className="ncx-page-header__subtitle">{subtitle}</p>}
        {showEnvironment && <PageEnvironmentContext prefix={environmentPrefix} />}
        {children}
      </div>
      {actions && <div className="ncx-page-header__actions">{actions}</div>}
    </header>
  );
}
