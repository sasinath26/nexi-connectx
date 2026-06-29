package com.nexi.connectx.workflow.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nexi.connectx.model.ExecutionStatus;
import com.nexi.connectx.model.WorkflowExecution;
import com.nexi.connectx.monitoring.WorkflowTrackingService;
import com.nexi.connectx.notifications.NotificationService;
import com.nexi.connectx.workflow.model.*;
import com.nexi.connectx.workflow.repository.WorkflowDefinitionRepository;
import com.nexi.connectx.workflow.repository.WorkflowNodeExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@RequiredArgsConstructor
public class WorkflowOrchestrationService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowOrchestrationService.class);

    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final WorkflowNodeExecutionRepository nodeExecutionRepository;
    private final WorkflowPluginRegistry pluginRegistry;
    private final WorkflowTrackingService workflowTrackingService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    private final ExecutorService parallelExecutor = Executors.newCachedThreadPool();
    private final Object scheduleLock = new Object();
    private final Set<String> runningNodes = ConcurrentHashMap.newKeySet();

    @Transactional
    public WorkflowExecutionContext execute(Long workflowDefinitionId, String initialPayload) throws Exception {
        WorkflowDefinition definition = workflowDefinitionRepository.findById(workflowDefinitionId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowDefinitionId));

        if (definition.getStatus() != WorkflowDefinitionStatus.ACTIVE) {
            throw new IllegalStateException("Workflow is not active: " + definition.getCode());
        }
        return executeInternal(definition, initialPayload);
    }

    /**
     * Execute without requiring ACTIVE status — used by the UI Run button.
     */
    @Transactional
    public WorkflowExecutionContext executeAny(Long workflowDefinitionId, String initialPayload) throws Exception {
        WorkflowDefinition definition = workflowDefinitionRepository.findById(workflowDefinitionId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowDefinitionId));
        return executeInternal(definition, initialPayload);
    }

    private WorkflowExecutionContext executeInternal(WorkflowDefinition definition, String initialPayload) throws Exception {
        WorkflowExecutionContext rootContext = new WorkflowExecutionContext(
                definition.getId(), definition.getCode(), objectMapper);
        rootContext.setPayload(initialPayload);

        String routeId = "dynamic-workflow-" + definition.getId();
        WorkflowExecution tracking = workflowTrackingService.startExecution(
                rootContext.getExecutionId(), routeId, "DYNAMIC", definition.getCode());

        try {
            WorkflowGraph graph = new WorkflowGraph(definition.getNodes(), definition.getEdges());
            String startKey = definition.getTriggerNodeKey();
            if (startKey == null || startKey.isBlank()) {
                throw new IllegalStateException("Workflow has no trigger node: " + definition.getCode());
            }

            Map<String, String> completedOutputs = new ConcurrentHashMap<>();
            Set<String> completed = ConcurrentHashMap.newKeySet();
            executeDag(graph, definition, rootContext, startKey, initialPayload, completedOutputs, completed);

            rootContext.getNodeOutputs().putAll(completedOutputs);
            rootContext.setPayload(resolveFinalPayload(graph, definition, completedOutputs, initialPayload));

            workflowTrackingService.completeSuccess(
                    tracking.getId(), initialPayload, rootContext.getPayload(),
                    java.time.Duration.between(tracking.getStartedAt(), Instant.now()).toMillis());

            return rootContext;
        } catch (Exception e) {
            workflowTrackingService.completeFailure(tracking.getId(), e.getMessage(), false);
            notificationService.sendFailureNotification(rootContext.getExecutionId(), e.getMessage());
            throw e;
        }
    }

    private void executeDag(WorkflowGraph graph, WorkflowDefinition definition,
                            WorkflowExecutionContext rootContext, String startKey, String initialPayload,
                            Map<String, String> completedOutputs, Set<String> completed) throws Exception {
        int totalNodes = definition.getNodes().size();
        Queue<String> ready = new ConcurrentLinkedQueue<>();
        Set<String> queued = ConcurrentHashMap.newKeySet();
        enqueue(ready, queued, startKey, completed);

        List<Exception> errors = Collections.synchronizedList(new ArrayList<>());

        while (completed.size() < totalNodes) {
            List<String> batch = drainReady(ready, completed);
            if (batch.isEmpty()) {
                throw new IllegalStateException(
                        "Workflow deadlock: nodes still pending but none are runnable. Completed: "
                                + completed.size() + "/" + totalNodes);
            }

            List<CompletableFuture<Void>> futures = batch.stream()
                    .map(nodeKey -> CompletableFuture.runAsync(() -> {
                        try {
                            executeNode(graph, rootContext, nodeKey, initialPayload, completedOutputs, completed);
                            enqueueSuccessors(graph, rootContext, nodeKey, initialPayload,
                                    completedOutputs, completed, ready, queued);
                        } catch (Exception e) {
                            errors.add(e);
                        }
                    }, parallelExecutor))
                    .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            if (!errors.isEmpty()) {
                throw errors.get(0);
            }
        }
    }

    private List<String> drainReady(Queue<String> ready, Set<String> completed) {
        List<String> batch = new ArrayList<>();
        String nodeKey;
        while ((nodeKey = ready.poll()) != null) {
            if (!completed.contains(nodeKey)) {
                batch.add(nodeKey);
            }
        }
        return batch;
    }

    private void enqueue(Queue<String> ready, Set<String> queued, String nodeKey, Set<String> completed) {
        if (completed.contains(nodeKey) || queued.contains(nodeKey)) {
            return;
        }
        queued.add(nodeKey);
        ready.add(nodeKey);
    }

    private void enqueueSuccessors(WorkflowGraph graph, WorkflowExecutionContext rootContext,
                                   String completedNodeKey, String initialPayload,
                                   Map<String, String> completedOutputs, Set<String> completed,
                                   Queue<String> ready, Set<String> queued) throws Exception {
        WorkflowExecutionContext sourceContext = buildNodeContext(
                rootContext, graph, completedNodeKey, initialPayload, completedOutputs);

        synchronized (scheduleLock) {
            for (WorkflowEdge edge : graph.getOutgoingEdges(completedNodeKey)) {
                if (!graph.evaluateCondition(edge, sourceContext)) {
                    continue;
                }
                String succ = edge.getTargetNodeKey();
                if (completed.containsAll(graph.getPredecessorKeys(succ))) {
                    queued.remove(succ);
                    enqueue(ready, queued, succ, completed);
                }
            }
        }
    }

    private void executeNode(WorkflowGraph graph, WorkflowExecutionContext rootContext, String nodeKey,
                             String initialPayload, Map<String, String> completedOutputs,
                             Set<String> completed) throws Exception {
        if (!runningNodes.add(nodeKey)) {
            return;
        }
        try {
            if (completed.contains(nodeKey)) {
                return;
            }
            executeNodeInternal(graph, rootContext, nodeKey, initialPayload, completedOutputs, completed);
        } finally {
            runningNodes.remove(nodeKey);
        }
    }

    private void executeNodeInternal(WorkflowGraph graph, WorkflowExecutionContext rootContext, String nodeKey,
                                     String initialPayload, Map<String, String> completedOutputs,
                                     Set<String> completed) throws Exception {
        WorkflowNode node = graph.getNode(nodeKey);
        if (node == null) {
            throw new IllegalArgumentException("Unknown node: " + nodeKey);
        }

        WorkflowExecutionContext nodeContext = buildNodeContext(
                rootContext, graph, nodeKey, initialPayload, completedOutputs);

        long start = System.currentTimeMillis();
        WorkflowNodeExecution nodeExec = WorkflowNodeExecution.builder()
                .executionId(rootContext.getExecutionId())
                .workflowDefinitionId(rootContext.getWorkflowDefinitionId())
                .nodeKey(nodeKey)
                .status(ExecutionStatus.RUNNING)
                .inputPayload(truncate(nodeContext.getPayload()))
                .startedAt(Instant.now())
                .build();
        nodeExecutionRepository.save(nodeExec);

        try {
            pluginRegistry.getExecutor(node.getPluginType()).execute(nodeContext, node);
            completedOutputs.put(nodeKey, nodeContext.getPayload());
            rootContext.getNodeOutputs().put(nodeKey, nodeContext.getPayload());

            nodeExec.setStatus(ExecutionStatus.SUCCESS);
            nodeExec.setOutputPayload(truncate(nodeContext.getPayload()));
            nodeExec.setProcessingTimeMs(System.currentTimeMillis() - start);
            nodeExec.setCompletedAt(Instant.now());
            nodeExecutionRepository.save(nodeExec);

            workflowTrackingService.addLog(rootContext.getExecutionId(),
                    "dynamic-workflow-" + rootContext.getWorkflowDefinitionId(),
                    "INFO", "Completed node " + node.getLabel());

            completed.add(nodeKey);
            log.debug("Completed workflow node {} ({})", nodeKey, node.getLabel());
        } catch (Exception e) {
            nodeExec.setStatus(ExecutionStatus.FAILED);
            nodeExec.setErrorMessage(e.getMessage());
            nodeExec.setCompletedAt(Instant.now());
            nodeExecutionRepository.save(nodeExec);
            throw e;
        }
    }

    private WorkflowExecutionContext buildNodeContext(WorkflowExecutionContext rootContext, WorkflowGraph graph,
                                                      String nodeKey, String initialPayload,
                                                      Map<String, String> completedOutputs) throws Exception {
        WorkflowExecutionContext ctx = new WorkflowExecutionContext(
                rootContext.getExecutionId(),
                rootContext.getWorkflowDefinitionId(),
                rootContext.getWorkflowCode(),
                objectMapper);
        ctx.getNodeOutputs().putAll(completedOutputs);

        List<String> preds = graph.getPredecessorKeys(nodeKey);
        if (preds.isEmpty()) {
            ctx.setPayload(initialPayload != null ? initialPayload : rootContext.getPayload());
        } else if (preds.size() == 1) {
            ctx.setPayload(completedOutputs.getOrDefault(preds.get(0), ""));
        } else {
            ObjectNode merged = objectMapper.createObjectNode();
            for (String pred : preds) {
                String output = completedOutputs.get(pred);
                if (output == null) {
                    merged.putNull(pred);
                } else {
                    try {
                        JsonNode parsed = objectMapper.readTree(output);
                        merged.set(pred, parsed);
                    } catch (Exception e) {
                        merged.put(pred, output);
                    }
                }
            }
            ctx.setPayload(objectMapper.writeValueAsString(merged));
            ctx.setVariable("joinInputs", preds);
        }
        return ctx;
    }

    private String resolveFinalPayload(WorkflowGraph graph, WorkflowDefinition definition,
                                       Map<String, String> completedOutputs, String initialPayload) {
        Optional<String> joinOutput = definition.getNodes().stream()
                .map(WorkflowNode::getNodeKey)
                .filter(graph::isJoinNode)
                .filter(completedOutputs::containsKey)
                .findFirst()
                .map(completedOutputs::get);
        if (joinOutput.isPresent()) {
            return joinOutput.get();
        }
        return completedOutputs.values().stream().reduce((first, second) -> second).orElse(initialPayload);
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() > 4000 ? value.substring(0, 4000) : value;
    }
}
