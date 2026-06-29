package com.nexi.connectx.workflow.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexi.connectx.workflow.model.WorkflowNode;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class WorkflowExecutionContext {

    private final String executionId;
    private final Long workflowDefinitionId;
    private final String workflowCode;
    private final ObjectMapper objectMapper;

    private String payload;
    private String format;
    private final Map<String, Object> variables = new HashMap<>();
    private final Map<String, String> nodeOutputs = new HashMap<>();

    public WorkflowExecutionContext(Long workflowDefinitionId, String workflowCode, ObjectMapper objectMapper) {
        this(UUID.randomUUID().toString(), workflowDefinitionId, workflowCode, objectMapper);
    }

    public WorkflowExecutionContext(String executionId, Long workflowDefinitionId, String workflowCode,
                                    ObjectMapper objectMapper) {
        this.executionId = executionId;
        this.workflowDefinitionId = workflowDefinitionId;
        this.workflowCode = workflowCode;
        this.objectMapper = objectMapper;
    }

    public WorkflowExecutionContext branchCopy() {
        WorkflowExecutionContext copy = new WorkflowExecutionContext(
                executionId, workflowDefinitionId, workflowCode, objectMapper);
        copy.setPayload(payload);
        copy.setFormat(format);
        copy.variables.putAll(variables);
        copy.nodeOutputs.putAll(nodeOutputs);
        return copy;
    }

    public void setVariable(String key, Object value) {
        variables.put(key, value);
    }

    public Object getVariable(String key) {
        return variables.get(key);
    }

    public Map<String, Object> getNodeConfig(WorkflowNode node) {
        try {
            if (node.getConfigJson() == null || node.getConfigJson().isBlank()) {
                return Map.of();
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> config = objectMapper.readValue(node.getConfigJson(), Map.class);
            return config;
        } catch (Exception e) {
            return Map.of();
        }
    }
}
