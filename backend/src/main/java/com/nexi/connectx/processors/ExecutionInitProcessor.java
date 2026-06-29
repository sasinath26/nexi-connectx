package com.nexi.connectx.processors;

import com.nexi.connectx.model.WorkflowExecution;
import com.nexi.connectx.monitoring.WorkflowTrackingService;
import lombok.RequiredArgsConstructor;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("executionInitProcessor")
@RequiredArgsConstructor
public class ExecutionInitProcessor implements Processor {

    @Override
    public void process(Exchange exchange) {
        String routeId = exchange.getIn().getHeader(WorkflowProcessor.HEADER_ROUTE_ID, String.class);
        String sourceType = exchange.getIn().getHeader(WorkflowProcessor.HEADER_SOURCE_TYPE, String.class);
        String sourceFile = exchange.getIn().getHeader(Exchange.FILE_NAME_ONLY, String.class);
        String workflowId = exchange.getIn().getHeader(WorkflowProcessor.HEADER_WORKFLOW_ID, String.class);

        if (workflowId == null) {
            workflowId = UUID.randomUUID().toString();
            exchange.getIn().setHeader(WorkflowProcessor.HEADER_WORKFLOW_ID, workflowId);
        }

        WorkflowExecution execution = workflowTrackingService.startExecution(
                workflowId, routeId, sourceType, sourceFile);
        exchange.getIn().setHeader(WorkflowProcessor.HEADER_EXECUTION_ID, execution.getId());
    }

    private final WorkflowTrackingService workflowTrackingService;
}
