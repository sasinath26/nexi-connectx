export default function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="ncx-loading">
      <span className="ncx-spinner" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
