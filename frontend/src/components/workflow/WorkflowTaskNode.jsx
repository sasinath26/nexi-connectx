import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { NODE_WIDTH } from './workflowUtils';

const STATUS_CLASS = {
  SUCCESS: 'wf-node--success',
  FAILED: 'wf-node--failed',
  RUNNING: 'wf-node--running',
  PENDING: 'wf-node--pending',
  RETRYING: 'wf-node--running',
  WAITING: 'wf-node--pending',
  DISABLED: 'wf-node--disabled',
};

const STATUS_LABEL = {
  SUCCESS: 'Success',
  FAILED: 'Failed',
  RUNNING: 'Running',
  PENDING: 'Waiting',
  RETRYING: 'Retry',
  WAITING: 'Waiting',
  DISABLED: 'Disabled',
};

function WorkflowTaskNode({ data, selected }) {
  const {
    style,
    label,
    pluginName,
    icon,
    isTrigger,
    executionStatus,
    disabled,
    onConfigure,
    onDelete,
    onDuplicate,
  } = data;
  const color = style?.color || '#2563eb';
  const status = disabled ? 'DISABLED' : executionStatus;
  const statusClass = status ? STATUS_CLASS[status] || '' : '';

  return (
    <div
      className={`wf-node wf-node--premium ${selected ? 'wf-node--selected' : ''} ${statusClass} ${
        executionStatus === 'RUNNING' ? 'wf-node--pulse' : ''
      }`}
      style={{
        width: NODE_WIDTH,
        borderLeftColor: color,
        position: 'relative',
      }}
      title="Double-click to configure"
    >
      {isTrigger && (
        <span className="wf-node__trigger-flag" title="Entry trigger">
          ▶
        </span>
      )}
      {executionStatus === 'FAILED' && <span className="wf-node__error-dot" title="Failed" />}
      <div className="wf-node__actions">
        <button type="button" className="wf-node__action-btn" onClick={(e) => { e.stopPropagation(); onConfigure?.(); }}>
          Configure
        </button>
        <button type="button" className="wf-node__action-btn" onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}>
          Duplicate
        </button>
        <button type="button" className="wf-node__action-btn" onClick={(e) => { e.stopPropagation(); onDelete?.(); }}>
          Delete
        </button>
      </div>
      <Handle type="target" position={Position.Left} className="wf-handle" />
      <div className="wf-node__body">
        <span className="wf-node__icon-lg">{icon || '▸'}</span>
        <div className="wf-node__text">
          <div className="wf-node__title">{label}</div>
          <div className="wf-node__subtitle">{pluginName}</div>
          <div className="wf-node__metrics-row">
            {data.processingTimeMs != null && (
              <span className="wf-node__metric-tag">{data.processingTimeMs}ms</span>
            )}
            {data.recordCount != null && (
              <span className="wf-node__metric-tag">{data.recordCount} rec</span>
            )}
            {data.retryCount != null && data.retryCount > 0 && (
              <span className="wf-node__metric-tag wf-node__metric-tag--warn">↻ {data.retryCount}</span>
            )}
          </div>
        </div>
        {status && (
          <span className={`wf-node__status-pill wf-node__status-pill--${status.toLowerCase()}`}>
            {STATUS_LABEL[status] || status}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="wf-handle" />
    </div>
  );
}

export default memo(WorkflowTaskNode);
