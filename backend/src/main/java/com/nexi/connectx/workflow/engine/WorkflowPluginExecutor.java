package com.nexi.connectx.workflow.engine;

import com.nexi.connectx.workflow.model.PluginType;
import com.nexi.connectx.workflow.model.WorkflowNode;

public interface WorkflowPluginExecutor {

    PluginType getPluginType();

    void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception;
}
