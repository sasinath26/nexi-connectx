package com.nexi.connectx.workflow.routes;

import com.nexi.connectx.workflow.engine.DynamicWorkflowRouteService;
import com.nexi.connectx.workflow.engine.WorkflowOrchestrationService;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

@Component
public class DynamicWorkflowEngineRoute extends RouteBuilder {

    private final WorkflowOrchestrationService orchestrationService;

    public DynamicWorkflowEngineRoute(WorkflowOrchestrationService orchestrationService) {
        this.orchestrationService = orchestrationService;
    }

    @Override
    public void configure() {
        from(com.nexi.connectx.workflow.engine.WorkflowEngineConstants.ENGINE_URI)
                .routeId("dynamic-workflow-engine")
                .process(exchange -> {
                    Long defId = exchange.getIn().getHeader(
                            DynamicWorkflowRouteService.HEADER_WORKFLOW_DEFINITION_ID, Long.class);
                    String body = exchange.getIn().getBody(String.class);
                    if (body == null || body.isBlank()) {
                        body = "[]";
                    }
                    orchestrationService.execute(defId, body);
                });
    }
}
