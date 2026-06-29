package com.nexi.connectx.workflow.engine;

import com.nexi.connectx.workflow.model.WorkflowEdge;
import com.nexi.connectx.workflow.model.WorkflowNode;

import java.util.*;
import java.util.stream.Collectors;

public class WorkflowGraph {

    private final Map<String, WorkflowNode> nodesByKey;
    private final Map<String, List<WorkflowEdge>> outgoingEdges;
    private final Map<String, List<WorkflowEdge>> incomingEdges;

    public WorkflowGraph(List<WorkflowNode> nodes, List<WorkflowEdge> edges) {
        this.nodesByKey = nodes.stream()
                .collect(Collectors.toMap(WorkflowNode::getNodeKey, n -> n, (a, b) -> a));
        this.outgoingEdges = edges.stream()
                .collect(Collectors.groupingBy(WorkflowEdge::getSourceNodeKey));
        this.incomingEdges = edges.stream()
                .collect(Collectors.groupingBy(WorkflowEdge::getTargetNodeKey));
    }

    public WorkflowNode getNode(String nodeKey) {
        return nodesByKey.get(nodeKey);
    }

    public List<WorkflowEdge> getOutgoingEdges(String nodeKey) {
        return outgoingEdges.getOrDefault(nodeKey, List.of());
    }

    public List<WorkflowEdge> getIncomingEdges(String nodeKey) {
        return incomingEdges.getOrDefault(nodeKey, List.of());
    }

    public List<String> getPredecessorKeys(String nodeKey) {
        return getIncomingEdges(nodeKey).stream()
                .map(WorkflowEdge::getSourceNodeKey)
                .distinct()
                .toList();
    }

    public List<String> getSuccessorKeys(String nodeKey) {
        return getOutgoingEdges(nodeKey).stream()
                .map(WorkflowEdge::getTargetNodeKey)
                .distinct()
                .toList();
    }

    public boolean isJoinNode(String nodeKey) {
        return getPredecessorKeys(nodeKey).size() > 1;
    }

    public boolean evaluateCondition(WorkflowEdge edge, WorkflowExecutionContext context) {
        if (edge.getConditionExpression() == null || edge.getConditionExpression().isBlank()) {
            return true;
        }
        String expr = edge.getConditionExpression().trim();
        if (expr.contains("==")) {
            String[] parts = expr.split("==", 2);
            String field = parts[0].trim();
            String expected = parts[1].trim();
            Object actual = resolveField(field, context);
            return expected.equalsIgnoreCase(String.valueOf(actual));
        }
        return true;
    }

    private Object resolveField(String field, WorkflowExecutionContext context) {
        if ("format".equalsIgnoreCase(field)) {
            return context.getFormat();
        }
        return context.getVariable(field);
    }
}
