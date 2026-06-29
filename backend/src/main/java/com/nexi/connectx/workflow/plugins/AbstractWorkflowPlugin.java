package com.nexi.connectx.workflow.plugins;

import com.nexi.connectx.workflow.engine.WorkflowExecutionContext;
import com.nexi.connectx.workflow.model.WorkflowNode;

import java.util.Map;

public abstract class AbstractWorkflowPlugin {

    protected String configString(WorkflowExecutionContext context, WorkflowNode node, String key, String defaultValue) {
        Map<String, Object> config = context.getNodeConfig(node);
        Object value = config.get(key);
        return value != null ? value.toString() : defaultValue;
    }
}
