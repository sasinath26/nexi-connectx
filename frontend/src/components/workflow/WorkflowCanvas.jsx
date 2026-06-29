import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import WorkflowTaskNode from './WorkflowTaskNode';
import FloatingCanvasControls from './FloatingCanvasControls';
import { createNodeFromPlugin, snapPosition, SNAP_GRID, buildFlowEdges } from './workflowUtils';

const nodeTypes = { workflowTask: WorkflowTaskNode };

function snapNodeChanges(changes, nodes) {
  return applyNodeChanges(
    changes.map((c) => {
      if (c.type === 'position' && c.position && !c.dragging) {
        return { ...c, position: snapPosition(c.position) };
      }
      return c;
    }),
    nodes
  );
}

function CanvasInner({
  canvasKey,
  initialNodes,
  initialEdges,
  triggerNodeKey,
  nodeStatuses,
  executing,
  onGraphChange,
  onSelectNode,
  onEditNode,
  onDeleteNode,
  onPaneClick,
  selectedNodeId,
  showMinimap = true,
  onToggleMinimap,
  canvasLocked = false,
  onToggleCanvasLock,
  onAutoLayout,
  onToggleSidebar,
  sidebarCollapsed,
  clipboardRef,
  onUndoRedo,
}) {
  const wrapperRef = useRef(null);
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    setNodes(
      initialNodes.map((n) => ({
        ...n,
        position: snapPosition(n.position),
        selected: n.id === selectedNodeId,
        data: {
          ...n.data,
          isTrigger: n.id === triggerNodeKey,
          executionStatus: nodeStatuses?.[n.id] || n.data?.executionStatus,
        },
      }))
    );
    setEdges(buildFlowEdges(
      initialEdges.map((e) => ({
        sourceNodeKey: e.source,
        targetNodeKey: e.target,
        conditionExpression: typeof e.label === 'string' ? e.label : '',
      })),
      nodeStatuses,
      executing
    ));
  }, [canvasKey, initialNodes, initialEdges, triggerNodeKey, selectedNodeId, nodeStatuses, executing, setNodes, setEdges]);

  const publish = useCallback(
    (nextNodes, nextEdges) => onGraphChange(nextNodes, nextEdges),
    [onGraphChange]
  );

  const handleNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const next = snapNodeChanges(changes, nds);
        publish(next, edges);
        return next;
      });
    },
    [setNodes, edges, publish]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        publish(nodes, next);
        return next;
      });
    },
    [setEdges, nodes, publish]
  );

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...params,
            type: 'default',
            animated: false,
            markerEnd: { type: 'arrowclosed', color: '#64748b' },
            style: { stroke: '#64748b', strokeWidth: 2.5 },
          },
          eds
        );
        publish(nodes, next);
        return next;
      });
    },
    [setEdges, nodes, publish]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/reactflow-plugin');
      if (!raw) return;
      const plugin = JSON.parse(raw);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setNodes((nds) => {
        const newNode = createNodeFromPlugin(plugin, position, nds.map((n) => n.id));
        const next = nds.concat(newNode);
        publish(next, edges);
        onSelectNode(newNode);
        return next;
      });
    },
    [screenToFlowPosition, setNodes, edges, publish, onSelectNode]
  );

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const isMod = e.ctrlKey || e.metaKey;
      const nds = getNodes();
      const eds = getEdges();

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        const nextNodes = nds.filter((n) => n.id !== selectedNodeId);
        const nextEdges = eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId);
        setNodes(nextNodes);
        setEdges(nextEdges);
        publish(nextNodes, nextEdges);
        onSelectNode(null);
      }

      if (isMod && e.key === 'c' && selectedNodeId) {
        const node = nds.find((n) => n.id === selectedNodeId);
        if (node && clipboardRef) clipboardRef.current = JSON.parse(JSON.stringify(node));
      }

      if (isMod && e.key === 'v' && clipboardRef?.current) {
        e.preventDefault();
        const src = clipboardRef.current;
        let idx = nds.length + 1;
        let newId = `n${idx}`;
        while (nds.some((n) => n.id === newId)) {
          idx += 1;
          newId = `n${idx}`;
        }
        const copy = {
          ...src,
          id: newId,
          position: snapPosition({ x: src.position.x + SNAP_GRID * 2, y: src.position.y + SNAP_GRID * 2 }),
          selected: true,
          data: { ...src.data, isTrigger: false },
        };
        const nextNodes = [...nds.map((n) => ({ ...n, selected: false })), copy];
        setNodes(nextNodes);
        publish(nextNodes, eds);
        onSelectNode(copy);
      }

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndoRedo?.('undo');
      }
      if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        onUndoRedo?.('redo');
      }

      if (e.key === 'l' && isMod) {
        e.preventDefault();
        onAutoLayout?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    selectedNodeId,
    getNodes,
    getEdges,
    setNodes,
    setEdges,
    publish,
    onSelectNode,
    clipboardRef,
    onUndoRedo,
    onAutoLayout,
  ]);

  const displayNodes = nodes.map((n) => ({
    ...n,
    selected: n.id === selectedNodeId,
    data: {
      ...n.data,
      isTrigger: n.id === triggerNodeKey,
      executionStatus: nodeStatuses?.[n.id] || n.data?.executionStatus,
      onConfigure: () => onEditNode?.(n),
      onDelete: () => onDeleteNode?.(n.id),
    },
  }));

  const displayEdges = buildFlowEdges(
    edges.map((e) => ({
      sourceNodeKey: e.source,
      targetNodeKey: e.target,
      conditionExpression: typeof e.label === 'string' ? e.label : '',
    })),
    nodeStatuses,
    executing
  );

  return (
    <div className="wf-canvas-wrap" ref={wrapperRef}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => onSelectNode?.(node)}
        onNodeDoubleClick={(_, node) => onEditNode?.(node)}
        onPaneClick={() => onPaneClick?.()}
        onMove={(_, viewport) => setZoom(Math.round(viewport.zoom * 100))}
        nodeTypes={nodeTypes}
        snapToGrid
        snapGrid={[SNAP_GRID, SNAP_GRID]}
        fitView
        panOnScroll
        nodesDraggable={!canvasLocked}
        nodesConnectable={!canvasLocked}
        elementsSelectable={!canvasLocked}
        selectionOnDrag
        panOnDrag={canvasLocked ? true : [1, 2]}
        multiSelectionKeyCode={['Control', 'Meta']}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{ type: 'smoothstep', style: { strokeWidth: 2, stroke: '#94a3b8' } }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.25}
        maxZoom={2}
      >
        <Background gap={SNAP_GRID} size={1} color="#e5e7eb" />
        {showMinimap && (
          <MiniMap
            className="wf-minimap"
            maskColor="rgba(31, 41, 55, 0.12)"
            nodeColor={(n) => n.data?.style?.color || '#94a3b8'}
            nodeStrokeWidth={2}
            pannable
            zoomable
          />
        )}
      </ReactFlow>
      <FloatingCanvasControls
        onAutoLayout={onAutoLayout}
        showMinimap={showMinimap}
        onToggleMinimap={onToggleMinimap}
        canvasLocked={canvasLocked}
        onToggleLock={onToggleCanvasLock}
      />
      {onToggleSidebar && (
        <button
          type="button"
          className="wf-palette-toggle"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Expand task palette' : 'Collapse task palette'}
        >
          {sidebarCollapsed ? '▸' : '◂'}
        </button>
      )}
      <div className="wf-canvas-hint">
        Zoom: <strong>{zoom}%</strong> · Double-click task to configure · Del delete · Ctrl+Z undo
      </div>
    </div>
  );
}

export default function WorkflowCanvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
