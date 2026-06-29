import { MarkerType } from 'reactflow';

export const NODE_WIDTH = 172;
export const NODE_HEIGHT = 52;
export const SNAP_GRID = 20;

export const PALETTE_CATEGORIES = [
  'Source Connectors',
  'Processing Tasks',
  'Validation',
  'Flow Control',
  'Messaging',
  'Database',
  'Notifications',
  'Monitoring',
];

/** Color-coded categories per UI spec */
const STYLE_BY_PALETTE = {
  'Source Connectors': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)', label: 'Source', icon: '⬇' },
  'Processing Tasks': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.18)', label: 'Transform', icon: '⚙' },
  Validation: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', label: 'Validate', icon: '✓' },
  'Flow Control': { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.18)', label: 'Flow', icon: '⑂' },
  Messaging: { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.18)', label: 'Messaging', icon: '📨' },
  Database: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.18)', label: 'Database', icon: '▣' },
  Notifications: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)', label: 'Notify', icon: '✉' },
  Monitoring: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.18)', label: 'Monitor', icon: '📊' },
};

export const STATUS_COLORS = {
  RUNNING: '#3b82f6',
  SUCCESS: '#22c55e',
  FAILED: '#ef4444',
  PENDING: '#64748b',
  RETRYING: '#f59e0b',
};

export const PLUGIN_ICONS = {
  FILE_UPLOAD: '📁',
  FILE_READ: '📄',
  SFTP_READ: '📡',
  REST_API: '🌐',
  KAFKA_CONSUMER: '📥',
  KAFKA_PUBLISH: '📤',
  MANUAL_TRIGGER: '▶',
  CSV_TRANSFORM: '🔄',
  XML_TRANSFORM: '🔄',
  JSON_TRANSFORM: '🔄',
  JSON_VALIDATE: '✓',
  DATA_ENRICH: '✨',
  DB_INSERT: '🗄',
  SQL_EXEC: '🗄',
  EMAIL_NOTIFICATION: '✉',
  SLACK_NOTIFICATION: '💬',
  SHELL_EXEC: '⌘',
  PARALLEL_SPLIT: '⑂',
  PARALLEL_JOIN: '⑂',
  CONDITIONAL_BRANCH: '⑂',
};

export function snapPosition(pos) {
  return {
    x: Math.round(pos.x / SNAP_GRID) * SNAP_GRID,
    y: Math.round(pos.y / SNAP_GRID) * SNAP_GRID,
  };
}

export function paletteCategory(plugin) {
  const type = plugin.type || '';
  if (plugin.category === 'Validate' || type.includes('VALIDATE')) return 'Validation';
  if (plugin.trigger || (plugin.category === 'Source' && !type.includes('KAFKA'))) {
    return 'Source Connectors';
  }
  if (type.includes('KAFKA')) return 'Messaging';
  if (plugin.category === 'Sink' || type.includes('DB') || type === 'SQL_EXEC') return 'Database';
  if (plugin.category === 'Notification') return 'Notifications';
  if (
    plugin.category === 'Control' ||
    ['PARALLEL_SPLIT', 'PARALLEL_JOIN', 'CONDITIONAL_BRANCH'].includes(type)
  ) {
    return 'Flow Control';
  }
  if (plugin.category === 'Transform' || plugin.category === 'Task') {
    return 'Processing Tasks';
  }
  return 'Processing Tasks';
}

export function getNodeStyle(plugin) {
  const cat = plugin ? paletteCategory(plugin) : 'Processing Tasks';
  return STYLE_BY_PALETTE[cat] || STYLE_BY_PALETTE['Processing Tasks'];
}

export function getPluginIcon(plugin) {
  return PLUGIN_ICONS[plugin?.type] || STYLE_BY_PALETTE[paletteCategory(plugin)]?.icon || '▸';
}

export function pluginGroup(plugin) {
  return paletteCategory(plugin);
}

export function edgeColorForTarget(status, executing) {
  if (status === 'RUNNING' || (executing && !status)) return STATUS_COLORS.RUNNING;
  if (status === 'SUCCESS') return STATUS_COLORS.SUCCESS;
  if (status === 'FAILED') return STATUS_COLORS.FAILED;
  return '#94a3b8';
}

export function buildFlowEdges(formEdges, nodeStatuses = {}, executing = false) {
  return (formEdges || []).map((e, i) => {
    const target = e.targetNodeKey || e.target;
    const source = e.sourceNodeKey || e.source;
    const status = nodeStatuses[target];
    const color = edgeColorForTarget(status, executing);
    const animated = executing && (status === 'RUNNING' || !status);
    const strokeWidth = status === 'RUNNING' && executing ? 3 : 2;

    return {
      id: `edge-${source}-${target}-${i}`,
      source,
      target,
      type: 'smoothstep',
      animated,
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
      style: {
        stroke: color,
        strokeWidth,
        filter: animated ? 'drop-shadow(0 0 4px rgba(37, 99, 235, 0.45))' : undefined,
      },
      label: e.conditionExpression || undefined,
      labelStyle: { fill: '#6b7280', fontSize: 10 },
    };
  });
}

export function toFlowEdges(formEdges, nodeStatuses, executing) {
  return buildFlowEdges(formEdges, nodeStatuses, executing);
}

export function toFlowNodes(formNodes, plugins, triggerNodeKey, nodeStatuses = {}, nodeMeta = {}) {
  return (formNodes || []).map((n) => {
    const plugin = plugins.find((p) => p.type === n.pluginType);
    const style = getNodeStyle(plugin);
    const status = nodeStatuses[n.nodeKey];
    const meta = nodeMeta[n.nodeKey] || {};
    return {
      id: n.nodeKey,
      type: 'workflowTask',
      position: snapPosition({ x: n.positionX ?? 80, y: n.positionY ?? 80 }),
      data: {
        label: n.label,
        pluginType: n.pluginType,
        pluginName: plugin?.name || n.pluginType,
        description: plugin?.description || '',
        icon: getPluginIcon(plugin),
        group: plugin ? paletteCategory(plugin) : 'Processing Tasks',
        style,
        configJson: n.configJson || '{}',
        isTrigger: n.nodeKey === triggerNodeKey,
        executionStatus: status,
        processingTimeMs: meta.processingTimeMs,
      },
    };
  });
}

export function fromFlowNodes(flowNodes) {
  return flowNodes.map((n) => ({
    nodeKey: n.id,
    label: n.data.label,
    pluginType: n.data.pluginType,
    configJson: n.data.configJson || '{}',
    positionX: Math.round(n.position.x),
    positionY: Math.round(n.position.y),
  }));
}

export function fromFlowEdges(flowEdges) {
  return flowEdges.map((e) => ({
    sourceNodeKey: e.source,
    targetNodeKey: e.target,
    conditionExpression: typeof e.label === 'string' ? e.label : '',
  }));
}

export function createNodeFromPlugin(plugin, position, existingKeys) {
  let index = existingKeys.length + 1;
  let nodeKey = `n${index}`;
  while (existingKeys.includes(nodeKey)) {
    index += 1;
    nodeKey = `n${index}`;
  }
  const style = getNodeStyle(plugin);
  return {
    id: nodeKey,
    type: 'workflowTask',
    position: snapPosition(position),
    data: {
      label: plugin.name,
      pluginType: plugin.type,
      pluginName: plugin.name,
      description: plugin.description || '',
      icon: getPluginIcon(plugin),
      group: paletteCategory(plugin),
      style,
      configJson: '{}',
      isTrigger: false,
      executionStatus: null,
    },
  };
}

/** Topological auto-layout with even spacing */
export function autoLayoutNodes(flowNodes, flowEdges, triggerNodeKey) {
  if (!flowNodes.length) return flowNodes;

  const children = {};
  const incomingCount = {};
  flowNodes.forEach((n) => {
    incomingCount[n.id] = 0;
    children[n.id] = [];
  });
  flowEdges.forEach((e) => {
    const s = e.source;
    const t = e.target;
    if (children[s]) children[s].push(t);
    if (incomingCount[t] !== undefined) incomingCount[t] += 1;
  });

  const start =
    triggerNodeKey && flowNodes.find((n) => n.id === triggerNodeKey)
      ? triggerNodeKey
      : flowNodes.find((n) => incomingCount[n.id] === 0)?.id || flowNodes[0].id;

  const levels = new Map();
  const queue = [start];
  const visited = new Set();

  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const preds = flowEdges.filter((e) => e.target === id).map((e) => e.source);
    const lvl = preds.length ? Math.max(...preds.map((p) => (levels.has(p) ? levels.get(p) + 1 : 0))) : 0;
    levels.set(id, preds.length ? Math.max(...preds.map((p) => levels.get(p) ?? 0)) + 1 : 0);
    (children[id] || []).forEach((c) => queue.push(c));
  }

  flowNodes.forEach((n) => {
    if (!levels.has(n.id)) levels.set(n.id, 0);
  });

  const byLevel = {};
  flowNodes.forEach((n) => {
    const l = levels.get(n.id);
    if (!byLevel[l]) byLevel[l] = [];
    byLevel[l].push(n.id);
  });

  const GAP_X = NODE_WIDTH + 100;
  const GAP_Y = NODE_HEIGHT + 64;

  return flowNodes.map((n) => {
    const l = levels.get(n.id);
    const siblings = byLevel[l];
    const idx = siblings.indexOf(n.id);
    const count = siblings.length;
    const startY = 100 + idx * GAP_Y - ((count - 1) * GAP_Y) / 2;
    return {
      ...n,
      position: snapPosition({ x: 100 + l * GAP_X, y: startY }),
    };
  });
}

export function validateWorkflow(form, flowNodes, flowEdges) {
  const issues = [];
  if (!form?.triggerNodeKey) issues.push('Set an entry trigger node');
  if (!flowNodes.length) issues.push('Add at least one task');
  const keys = new Set(flowNodes.map((n) => n.id));
  flowEdges.forEach((e) => {
    if (!keys.has(e.source) || !keys.has(e.target)) issues.push('Invalid edge references');
  });
  const connected = new Set();
  flowEdges.forEach((e) => {
    connected.add(e.source);
    connected.add(e.target);
  });
  if (flowNodes.length > 1) {
    flowNodes.forEach((n) => {
      if (n.id !== form.triggerNodeKey && !connected.has(n.id)) {
        issues.push(`Disconnected node: ${n.data?.label || n.id}`);
      }
    });
  }
  return issues;
}

export function parseConfig(configJson) {
  try {
    return JSON.parse(configJson || '{}');
  } catch {
    return {};
  }
}

export function stringifyConfig(config) {
  return JSON.stringify(config, null, 2);
}

export const PLUGIN_FIELD_LABELS = {
  inputDir: 'File path / input directory',
  filePattern: 'File pattern (e.g. *.csv)',
  path: 'File path',
  host: 'SFTP host',
  port: 'Port',
  username: 'Username',
  password: 'Password',
  remoteDir: 'Remote directory',
  url: 'URL',
  method: 'HTTP method',
  topic: 'Topic name',
  groupId: 'Consumer group ID',
  sql: 'SQL statement',
  mode: 'Execution mode',
  command: 'Shell command',
  simulate: 'Simulation mode',
  subject: 'Email subject',
  message: 'Message body',
  to: 'Recipient email',
  region: 'Enrichment region',
  conditionField: 'Condition field',
};
