import { useReactFlow } from 'reactflow';

export default function FloatingCanvasControls({
  onAutoLayout,
  showMinimap,
  onToggleMinimap,
  canvasLocked,
  onToggleLock,
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="wf-float-controls" role="toolbar" aria-label="Canvas controls">
      <button type="button" className="wf-float-controls__btn" onClick={() => zoomIn()} title="Zoom in">
        +
      </button>
      <button type="button" className="wf-float-controls__btn" onClick={() => zoomOut()} title="Zoom out">
        −
      </button>
      <button
        type="button"
        className="wf-float-controls__btn"
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
        title="Fit to screen"
      >
        ⊡
      </button>
      <button type="button" className="wf-float-controls__btn" onClick={() => onAutoLayout?.()} title="Auto layout (Ctrl+L)">
        ⊞
      </button>
      <span className="wf-float-controls__sep" />
      <button
        type="button"
        className={`wf-float-controls__btn ${showMinimap ? 'active' : ''}`}
        onClick={onToggleMinimap}
        title="Toggle minimap"
      >
        ◫
      </button>
      <button
        type="button"
        className={`wf-float-controls__btn ${canvasLocked ? 'active' : ''}`}
        onClick={onToggleLock}
        title="Lock canvas"
      >
        {canvasLocked ? '🔒' : '🔓'}
      </button>
    </div>
  );
}
