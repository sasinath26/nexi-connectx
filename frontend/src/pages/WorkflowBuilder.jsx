import { useCallback, useEffect, useMemo, useRef, useState, Component } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getWorkflowDefinitions,
  getWorkflowPlugins,
  getWorkflowDefinition,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  activateWorkflow,
  runWorkflowDefinition,
  getWorkflowNodeExecutions,
  getWorkflowLogs,
  getWorkflowHistory,
  getDashboard,
} from '../api/client';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import NodeLibrary from '../components/workflow/NodeLibrary';
import PropertiesPanel from '../components/workflow/PropertiesPanel';
import SettingsDrawer from '../components/workflow/SettingsDrawer';
import BottomMonitoringPanel from '../components/workflow/BottomMonitoringPanel';
import EnvironmentBadge from '../components/ui/EnvironmentBadge';
import { usePlatformEnvironment } from '../context/PlatformEnvironmentContext';
import { confirmProductionAction } from '../utils/productionSafety';
import {
  toFlowNodes,
  toFlowEdges,
  fromFlowNodes,
  fromFlowEdges,
  createNodeFromPlugin,
  autoLayoutNodes,
  validateWorkflow,
} from '../components/workflow/workflowUtils';
import '../styles/workflow-builder.css';
import '../styles/workflow-enterprise.css';

const MAX_UNDO = 40;

/* ── Error Boundary ─────────────────────────────────────────────────────── */
class WorkflowErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: '1rem', padding: '2rem',
          background: '#0f172a', color: '#e2e8f0',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h2 style={{ color: '#ef4444' }}>Something went wrong</h2>
          <p style={{ color: '#94a3b8', textAlign: 'center', maxWidth: 480 }}>
            {this.state.error?.message || 'An unexpected error occurred in the Workflow Builder.'}
          </p>
          <button
            style={{
              padding: '0.5rem 1.25rem', background: '#3b82f6', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
            }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WorkflowBuilder() {
  return (
    <WorkflowErrorBoundary>
      <WorkflowBuilderInner />
    </WorkflowErrorBoundary>
  );
}

function WorkflowBuilderInner() {
  const location = useLocation();
  const [workflows, setWorkflows] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [flowNodes, setFlowNodes] = useState([]);
  const [flowEdges, setFlowEdges] = useState([]);
  const [canvasKey, setCanvasKey] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [propertiesMode, setPropertiesMode] = useState('workflow');
  const [dirty, setDirty] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMinimap, setShowMinimap] = useState(
    () => localStorage.getItem('wf-show-minimap') !== 'false'
  );
  const [monitoringTab, setMonitoringTab] = useState('logs');
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [nodeMeta, setNodeMeta] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState(null);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [canvasLocked, setCanvasLocked] = useState(false);
  const [logsPanelHeight, setLogsPanelHeight] = useState(240);
  const [validationIssues, setValidationIssues] = useState([]);
  const [versionTag, setVersionTag] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [messageType, setMessageType] = useState('success');
  const { environment, isProduction } = usePlatformEnvironment();

  const clipboardRef = useRef(null);
  const propertiesPanelRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const formRef = useRef(null);
  const flowNodesRef = useRef([]);
  const flowEdgesRef = useRef([]);
  const selectedIdRef = useRef(null);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    flowNodesRef.current = flowNodes;
  }, [flowNodes]);

  useEffect(() => {
    flowEdgesRef.current = flowEdges;
  }, [flowEdges]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const markDirty = useCallback(() => setDirty(true), []);

  const toggleMinimap = () => {
    setShowMinimap((v) => {
      const next = !v;
      localStorage.setItem('wf-show-minimap', String(next));
      return next;
    });
  };

  const pushHistory = useCallback((nodes, edges) => {
    undoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const load = async () => {
    try {
      const [wfRes, pluginRes] = await Promise.all([
        getWorkflowDefinitions(),
        getWorkflowPlugins(),
      ]);
      setWorkflows(wfRes.data);
      setPlugins(pluginRes.data);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoring = useCallback(async () => {
    try {
      const [logsRes, histRes, dashRes] = await Promise.all([
        getWorkflowLogs(),
        getWorkflowHistory(selectedId ?? undefined, form?.code),
        getDashboard(),
      ]);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : (logsRes.data?.content ?? logsRes.data?.logs ?? []));
      setHistory(Array.isArray(histRes.data) ? histRes.data : (histRes.data?.content ?? histRes.data?.history ?? []));
      setMetrics(dashRes.data);
    } catch {
      /* optional */
    }
  }, [selectedId, form?.code]);

  useEffect(() => {
    load();
    loadMonitoring();
    const interval = setInterval(loadMonitoring, 12000);
    return () => clearInterval(interval);
  }, [loadMonitoring]);

  useEffect(() => {
    const openId = location.state?.workflowId;
    if (!loading && openId != null && Number(openId) !== Number(selectedId)) {
      selectWorkflow(openId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, location.state?.workflowId]);

  useEffect(() => {
    if (!loading) loadMonitoring();
  }, [selectedId, loading, loadMonitoring]);

  useEffect(() => {
    if (!showMoreMenu) return undefined;
    const close = (e) => {
      if (!e.target.closest('.wf-more-wrap')) setShowMoreMenu(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showMoreMenu]);

  const applyToCanvas = useCallback(
    (wf, statuses = {}, meta = {}) => {
      setFlowNodes(toFlowNodes(wf.nodes || [], plugins, wf.triggerNodeKey, statuses, meta));
      setFlowEdges(toFlowEdges(wf.edges || [], statuses, !!statuses && Object.keys(statuses).length > 0));
      setCanvasKey((k) => k + 1);
      setSelectedNodeId(null);
      setPropertiesMode('workflow');
    },
    [plugins]
  );

  const applyLoadedWorkflow = useCallback(
    (wf) => {
      const nextForm = {
        code: wf.code,
        name: wf.name,
        description: wf.description || '',
        status: wf.status,
        triggerNodeKey: wf.triggerNodeKey || '',
        nodes: wf.nodes || [],
        edges: wf.edges || [],
      };
      setForm(nextForm);
      applyToCanvas(nextForm);
      setDirty(false);
      undoStack.current = [];
      redoStack.current = [];
    },
    [applyToCanvas]
  );

  const selectWorkflow = async (id) => {
    if (dirty && !window.confirm('You have unsaved changes. Discard them and switch workflow?')) {
      return;
    }
    const numId = id ? Number(id) : null;
    setSelectedId(numId);
    setPropertiesMode('workflow');
    setNodeStatuses({});
    setNodeMeta({});
    setValidationIssues([]);
    if (!numId) {
      setForm(null);
      setFlowNodes([]);
      setFlowEdges([]);
      return;
    }
    try {
      const res = await getWorkflowDefinition(numId);
      applyLoadedWorkflow(res.data);
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load workflow';
      setMessageType('error');
      setMessage(`Failed to load workflow: ${errMsg}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const newWorkflow = () => {
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setSelectedId(null);
    setPropertiesMode('workflow');
    setNodeStatuses({});
    const nextForm = {
      code: `workflow-${Date.now()}`,
      name: 'New Workflow',
      description: '',
      status: 'DRAFT',
      triggerNodeKey: 'n1',
      nodes: [{
        nodeKey: 'n1',
        label: 'Manual Trigger',
        pluginType: 'MANUAL_TRIGGER',
        configJson: '{}',
        positionX: 200,
        positionY: 120,
      }],
      edges: [],
    };
    setForm(nextForm);
    applyToCanvas(nextForm);
    setDirty(true);
    undoStack.current = [];
    redoStack.current = [];
  };

  const buildSavePayload = useCallback((currentForm, nodes, edges) => ({
    code: currentForm.code,
    name: currentForm.name,
    description: currentForm.description || '',
    status: currentForm.status || 'DRAFT',
    triggerNodeKey: currentForm.triggerNodeKey || '',
    nodes: fromFlowNodes(nodes),
    edges: fromFlowEdges(edges),
  }), []);

  const save = async () => {
    const currentForm = formRef.current;
    const nodes = flowNodesRef.current;
    const edges = flowEdgesRef.current;
    const workflowId = selectedIdRef.current;

    if (!currentForm) return false;
    if (saving) return false;

    const payload = buildSavePayload(currentForm, nodes, edges);
    setSaving(true);
    try {
      if (workflowId) {
        await updateWorkflowDefinition(workflowId, payload);
        const refreshed = await getWorkflowDefinition(workflowId);
        applyLoadedWorkflow(refreshed.data);
        setMessageType('success');
        setMessage('Workflow saved');
      } else {
        const res = await createWorkflowDefinition(payload);
        const newId = res.data.id;
        setSelectedId(newId);
        selectedIdRef.current = newId;
        const refreshed = await getWorkflowDefinition(newId);
        applyLoadedWorkflow(refreshed.data);
        setMessageType('success');
        setMessage('Workflow created');
      }
      await load();
      setTimeout(() => setMessage(''), 3000);
      return true;
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save workflow';
      setMessageType('error');
      setMessage(`Save failed: ${errMsg}`);
      setTimeout(() => setMessage(''), 6000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleGraphChange = useCallback((nodes, edges) => {
    setFlowNodes(nodes);
    setFlowEdges(edges);
    setForm((prev) => (prev ? { ...prev, nodes: fromFlowNodes(nodes), edges: fromFlowEdges(edges) } : prev));
    markDirty();
  }, [markDirty]);

  const handleUndoRedo = useCallback((action) => {
    if (action === 'undo' && undoStack.current.length) {
      redoStack.current.push({ nodes: flowNodes, edges: flowEdges });
      const prev = undoStack.current.pop();
      setFlowNodes(prev.nodes);
      setFlowEdges(prev.edges);
      setForm((f) => (f ? { ...f, nodes: fromFlowNodes(prev.nodes), edges: fromFlowEdges(prev.edges) } : f));
      setCanvasKey((k) => k + 1);
    }
    if (action === 'redo' && redoStack.current.length) {
      undoStack.current.push({ nodes: flowNodes, edges: flowEdges });
      const next = redoStack.current.pop();
      setFlowNodes(next.nodes);
      setFlowEdges(next.edges);
      setForm((f) => (f ? { ...f, nodes: fromFlowNodes(next.nodes), edges: fromFlowEdges(next.edges) } : f));
      setCanvasKey((k) => k + 1);
    }
  }, [flowNodes, flowEdges]);

  const runAutoLayout = useCallback(() => {
    if (!form) return;
    pushHistory(flowNodes, flowEdges);
    const laid = autoLayoutNodes(flowNodes, flowEdges, form.triggerNodeKey);
    setFlowNodes(laid);
    setForm((prev) => (prev ? { ...prev, nodes: fromFlowNodes(laid) } : prev));
    setCanvasKey((k) => k + 1);
    setMessage('Auto-layout applied');
    setTimeout(() => setMessage(''), 2000);
  }, [flowNodes, flowEdges, form, pushHistory]);

  const validate = () => {
    if (!form) return;
    const issues = validateWorkflow(form, flowNodes, flowEdges);
    setValidationIssues(issues);
    if (issues.length) {
      setMessage(`Validation failed: ${issues[0]}`);
    } else {
      setMessage('Workflow validation passed');
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const exportJson = () => {
    if (!form) return;
    const payload = {
      ...form,
      nodes: fromFlowNodes(flowNodes),
      edges: fromFlowEdges(flowEdges),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.code || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Workflow exported');
    setTimeout(() => setMessage(''), 2000);
  };

  const updateNode = useCallback((nodeId, patch) => {
    setFlowNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n))
    );
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.nodeKey === nodeId
            ? { ...n, label: patch.label ?? n.label, configJson: patch.configJson ?? n.configJson }
            : n
        ),
      };
    });
    markDirty();
  }, [markDirty]);

  const setTrigger = useCallback((nodeKey) => {
    setForm((prev) => (prev ? { ...prev, triggerNodeKey: nodeKey } : prev));
    setFlowNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, isTrigger: n.id === nodeKey } }))
    );
    markDirty();
  }, [markDirty]);

  const handleFormChange = useCallback((patch) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (formRef.current && !saving) save();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saving]);

  const deleteNode = useCallback((nodeId) => {
    pushHistory(flowNodes, flowEdges);
    setFlowNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setFlowEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.filter((n) => n.nodeKey !== nodeId),
        edges: prev.edges.filter((e) => e.sourceNodeKey !== nodeId && e.targetNodeKey !== nodeId),
        triggerNodeKey: prev.triggerNodeKey === nodeId ? '' : prev.triggerNodeKey,
      };
    });
    setSelectedNodeId(null);
    setPropertiesMode('workflow');
    setCanvasKey((k) => k + 1);
    markDirty();
  }, [flowNodes, flowEdges, pushHistory, markDirty]);

  const addPluginAtCenter = useCallback(
    (plugin) => {
      pushHistory(flowNodes, flowEdges);
      const position = { x: 220 + flowNodes.length * 48, y: 100 + flowNodes.length * 56 };
      const newNode = createNodeFromPlugin(plugin, position, flowNodes.map((n) => n.id));
      const nextNodes = [...flowNodes, newNode];
      setFlowNodes(nextNodes);
      setForm((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: fromFlowNodes(nextNodes),
          triggerNodeKey: prev.triggerNodeKey || (plugin.trigger ? newNode.id : prev.triggerNodeKey),
        };
      });
      setSelectedNodeId(newNode.id);
      markDirty();
    },
    [flowNodes, flowEdges, pushHistory, markDirty]
  );

  const applyExecutionStatuses = useCallback((nodeList) => {
    const statuses = {};
    const meta = {};
    (nodeList || []).forEach((n) => {
      statuses[n.nodeKey] = n.status;
      meta[n.nodeKey] = { processingTimeMs: n.processingTimeMs };
    });
    setNodeStatuses(statuses);
    setNodeMeta(meta);
    setFlowNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          executionStatus: statuses[n.id],
          processingTimeMs: meta[n.id]?.processingTimeMs,
        },
      }))
    );
    setFlowEdges((eds) =>
      toFlowEdges(fromFlowEdges(eds), statuses, true)
    );
    return nodeList;
  }, []);

  const pollExecution = async (executionId, untilDone = false) => {
    const terminal = new Set(['SUCCESS', 'FAILED', 'DLQ']);
    let nodes = [];
    const poll = async () => {
      const nodesRes = await getWorkflowNodeExecutions(executionId);
      nodes = nodesRes.data || [];
      applyExecutionStatuses(nodes);
      setLastExecution({ executionId, nodes });
      return nodes;
    };
    await poll();
    if (!untilDone) return nodes;
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 500));
      nodes = await poll();
      const allDone = nodes.length > 0 && nodes.every((n) => terminal.has(n.status));
      if (allDone) break;
    }
    return nodes;
  };

  const handleSelectNode = useCallback((node) => {
    setSelectedNodeId(node?.id || null);
  }, []);

  const handleEditNode = useCallback((node) => {
    if (!node) return;
    setSelectedNodeId(node.id);
    setPropertiesMode('node');
    setDrawerOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setPropertiesMode('workflow');
    setDrawerOpen(false);
  }, []);

  const openWorkflowSettings = useCallback(() => {
    setPropertiesMode('workflow');
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const runWorkflow = async () => {
    if (!selectedId) return;
    if (
      !confirmProductionAction(
        isProduction,
        'Run workflow in PRODUCTION? This executes against live systems.'
      )
    ) {
      return;
    }
    const issues = validateWorkflow(form, flowNodes, flowEdges);
    if (issues.length) {
      setValidationIssues(issues);
      setMessage(`Fix validation: ${issues[0]}`);
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    // Always save latest node config before running
    const saved = await save();
    if (!saved) return;
    setExecuting(true);
    setPanelCollapsed(false);
    setMonitoringTab('logs');
    setNodeStatuses({});
    setNodeMeta({});
    try {
      const res = await runWorkflowDefinition(selectedId);
      const execId = res.data.executionId;
      const nodes = await pollExecution(execId, true);
      setLastExecution({ executionId: execId, nodes });
      const failed = nodes?.filter(n => n.status === 'FAILED') || [];
      if (failed.length > 0) {
        setMessage(`Execution completed with ${failed.length} failed node(s): ${failed[0].errorMessage || ''}`);
      } else {
        setMessage('✅ Workflow executed successfully — data inserted into DB');
      }
      loadMonitoring();
    } catch (e) {
      const errMsg = e.response?.data?.error || e.response?.data?.message || e.message || 'Execution failed';
      setMessage(`❌ ${errMsg}`);
    } finally {
      setExecuting(false);
      setTimeout(() => setMessage(''), 8000);
    }
  };

  const deployWorkflow = async () => {
    if (!selectedId) return;
    if (
      !confirmProductionAction(
        isProduction,
        'Deploy to PRODUCTION? This activates live Camel routes and affects production workflows.'
      )
    ) {
      return;
    }
    const saved = await save();
    if (!saved) return;
    try {
      await activateWorkflow(selectedId);
      setForm((prev) => (prev ? { ...prev, status: 'ACTIVE' } : prev));
      setMessageType('success');
      setMessage('Workflow deployed (Camel route activated)');
      load();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Deploy failed';
      setMessageType('error');
      setMessage(`Deploy failed: ${errMsg}`);
      setTimeout(() => setMessage(''), 6000);
    }
  };

  const selectedNode = useMemo(
    () => flowNodes.find((n) => n.id === selectedNodeId) || null,
    [flowNodes, selectedNodeId]
  );

  const selectedPlugin = useMemo(
    () => plugins.find((p) => p.type === selectedNode?.data?.pluginType),
    [plugins, selectedNode]
  );

  const nodeExecutionLog = useMemo(() => {
    if (!selectedNodeId || !lastExecution?.nodes) return [];
    return lastExecution.nodes.filter((n) => n.nodeKey === selectedNodeId);
  }, [selectedNodeId, lastExecution]);

  if (loading) return <p className="loading">Loading workflow designer...</p>;

  const drawerTitle =
    propertiesMode === 'node' && selectedNode
      ? `${selectedNode.data?.label || 'Task'} — Configuration`
      : 'Workflow settings';

  return (
    <div className="workflow-workspace workflow-workspace--enterprise">
      {message && (
        <div className={`wf-toast ${messageType === 'error' ? 'wf-toast--error' : ''}`}>{message}</div>
      )}

      <header className="wf-subbar">
        <nav className="wf-breadcrumb" aria-label="Breadcrumb">
          Workflows / <strong>{form?.name || 'Untitled'}</strong>
        </nav>
        <EnvironmentBadge env={environment} className="wf-subbar__env-badge" />
        <select
          className="wf-topbar__select"
          value={versionTag}
          onChange={(e) => setVersionTag(e.target.value)}
          aria-label="Workflow version"
        >
          <option value="draft">Draft (unsaved)</option>
          <option value="v3.2.0">v3.2.0 — Published</option>
          <option value="v3.1.0">v3.1.0</option>
        </select>
        <select
          className="wf-topbar__select"
          aria-label="Open workflow"
          value={selectedId || ''}
          onChange={(e) => (e.target.value ? selectWorkflow(e.target.value) : newWorkflow())}
        >
          <option value="">+ New workflow</option>
          {workflows.map((wf) => (
            <option key={wf.id} value={wf.id}>{wf.name} ({wf.code})</option>
          ))}
        </select>
        <input
          className="toolbar-input"
          value={form?.name || ''}
          onChange={(e) => form && handleFormChange({ name: e.target.value })}
          placeholder="Display name"
          disabled={!form}
          aria-label="Workflow display name"
        />
        {form && (
          <span className={`badge ${form.status === 'ACTIVE' ? 'success' : 'neutral'}`}>{form.status}</span>
        )}
        {dirty && <span className="badge badge--dirty">Unsaved</span>}
        {validationIssues.length > 0 && (
          <span className="badge badge--warn" title={validationIssues.join(', ')}>Invalid</span>
        )}
        <div className="wf-subbar__actions">
          <div className="wf-subbar__group wf-subbar__group--primary">
            <button type="button" className="btn-run btn-sm" onClick={runWorkflow} disabled={!selectedId || executing}>
              ▶ {executing ? 'Running…' : 'Run'}
            </button>
          </div>
          <div className="wf-subbar__group">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={save}
              disabled={!form || saving}
              title="Save (Ctrl+S)"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="wf-icon-btn" onClick={validate} disabled={!form} title="Validate">
              ✓
            </button>
            <button type="button" className="wf-icon-btn" onClick={() => window.open('/monitoring', '_self')} title="Monitoring">
              ◎
            </button>
            <button type="button" className="wf-icon-btn" onClick={openWorkflowSettings} disabled={!form} title="Workflow settings">
              ⚙
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-deploy"
              onClick={deployWorkflow}
              disabled={!selectedId}
              title={
                form?.status === 'ACTIVE'
                  ? 'Re-deploy after saving changes'
                  : 'Activate Camel route for scheduled triggers'
              }
            >
              {form?.status === 'ACTIVE' ? 'Re-deploy' : 'Deploy'}
            </button>
          </div>
          <div className="wf-more-wrap">
            <button
              type="button"
              className="wf-icon-btn"
              onClick={() => setShowMoreMenu((m) => !m)}
              aria-expanded={showMoreMenu}
              title="More actions"
            >
              ⋮
            </button>
            {showMoreMenu && (
              <div className="wf-more-menu">
                <button type="button" onClick={() => { exportJson(); setShowMoreMenu(false); }} disabled={!form}>
                  Export JSON
                </button>
                <button type="button" onClick={() => { runAutoLayout(); setShowMoreMenu(false); }} disabled={!form}>
                  Auto layout
                </button>
                <button type="button" onClick={() => { toggleMinimap(); setShowMoreMenu(false); }}>
                  {showMinimap ? 'Hide minimap' : 'Show minimap'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {validationIssues.length > 0 && form && (
        <div className="wf-validation-panel" role="alert">
          <strong>Validation ({validationIssues.length})</strong>
          <ul>
            {validationIssues.map((issue, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="wf-validation-panel__issue"
                  onClick={() => {
                    const idMatch = issue.match(/\bn\d+\b/i);
                    const labelMatch = issue.match(/Disconnected node:\s*(.+)$/i);
                    let node = idMatch ? flowNodes.find((n) => n.id === idMatch[0]) : null;
                    if (!node && labelMatch) {
                      const label = labelMatch[1].trim();
                      node = flowNodes.find((n) => n.data?.label === label || n.id === label);
                    }
                    if (node) handleEditNode(node);
                  }}
                >
                  {issue}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!form ? (
        <div className="wf-empty-state">
          <div className="wf-empty-state__illus" aria-hidden>◇</div>
          <div>
            <h2>Workflow Designer</h2>
            <p>Create integration workflows visually — powered by Apache Camel</p>
            <ul className="wf-empty-state__tips">
              <li>Drag tasks from the left palette onto the canvas</li>
              <li>Connect nodes to define your DAG</li>
              <li>Validate, then run or deploy to Camel</li>
            </ul>
            <button type="button" className="btn btn-primary" onClick={newWorkflow}>
              Create Workflow
            </button>
          </div>
        </div>
      ) : (
        <div className="wf-designer">
          <div className={`wf-body ${sidebarCollapsed ? 'wf-body--collapsed' : ''}`}>
            <NodeLibrary
              plugins={plugins}
              onAddPlugin={addPluginAtCenter}
              collapsed={sidebarCollapsed}
            />
            <WorkflowCanvas
              canvasKey={canvasKey}
              initialNodes={flowNodes}
              initialEdges={flowEdges}
              triggerNodeKey={form.triggerNodeKey}
              nodeStatuses={nodeStatuses}
              executing={executing}
              showMinimap={showMinimap}
              onToggleMinimap={toggleMinimap}
              canvasLocked={canvasLocked}
              onToggleCanvasLock={() => setCanvasLocked((l) => !l)}
              onGraphChange={handleGraphChange}
              onSelectNode={handleSelectNode}
              onEditNode={handleEditNode}
              onDeleteNode={deleteNode}
              onPaneClick={handlePaneClick}
              selectedNodeId={selectedNodeId}
              onAutoLayout={runAutoLayout}
              onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
              sidebarCollapsed={sidebarCollapsed}
              clipboardRef={clipboardRef}
              onUndoRedo={handleUndoRedo}
            />
          </div>
          <SettingsDrawer open={drawerOpen && !!form} title={drawerTitle} onClose={closeDrawer}>
            <PropertiesPanel
              panelRef={propertiesPanelRef}
              propertiesMode={propertiesMode}
              form={form}
              flowNodes={flowNodes}
              lastExecution={lastExecution}
              onFormChange={handleFormChange}
              selectedNode={selectedNode}
              plugin={selectedPlugin}
              triggerNodeKey={form?.triggerNodeKey}
              onUpdateNode={updateNode}
              onSetTrigger={setTrigger}
              onDeleteNode={(id) => {
                deleteNode(id);
                closeDrawer();
              }}
              nodeExecutionLog={nodeExecutionLog}
            />
          </SettingsDrawer>
          <BottomMonitoringPanel
            logs={logs}
            history={history}
            executionNodes={lastExecution?.nodes || []}
            metrics={metrics}
            collapsed={panelCollapsed}
            activeTab={monitoringTab}
            panelHeight={logsPanelHeight}
            onResizePanel={setLogsPanelHeight}
            onToggleCollapse={() => setPanelCollapsed((c) => !c)}
          />
        </div>
      )}
    </div>
  );
}
