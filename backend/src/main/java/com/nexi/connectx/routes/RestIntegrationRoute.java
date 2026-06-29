package com.nexi.connectx.routes;

import com.nexi.connectx.config.NexiConnectXProperties;
import com.nexi.connectx.processors.WorkflowProcessor;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class RestIntegrationRoute extends RouteBuilder {

    private final NexiConnectXProperties properties;

    public RestIntegrationRoute(NexiConnectXProperties properties) {
        this.properties = properties;
    }

    @Override
    public void configure() {
        rest("/integration")
                .description("Nexi ConnectX REST Integration")
                .post("/trigger")
                    .description("Trigger integration workflow manually")
                    .consumes("application/json")
                    .produces("application/json")
                    .to("direct:rest-trigger");

        from("direct:rest-trigger")
                .routeId("rest-trigger-route")
                .setHeader(WorkflowProcessor.HEADER_ROUTE_ID, constant("rest-trigger-route"))
                .setHeader(WorkflowProcessor.HEADER_SOURCE_TYPE, constant("REST"))
                .setHeader(WorkflowProcessor.HEADER_WORKFLOW_ID, method(UUID.class, "randomUUID"))
                .setHeader(WorkflowProcessor.HEADER_FORMAT, constant("JSON"))
                .process("executionInitProcessor")
                .to("direct:integration-pipeline")
                .setBody(constant("{\"status\":\"accepted\"}"));

        from("timer:rest-poll?period=300000")
                .routeId("rest-api-poll-route")
                .autoStartup(false)
                .setHeader(WorkflowProcessor.HEADER_ROUTE_ID, constant("rest-api-poll-route"))
                .setHeader(WorkflowProcessor.HEADER_SOURCE_TYPE, constant("REST_API"))
                .setHeader(WorkflowProcessor.HEADER_WORKFLOW_ID, method(UUID.class, "randomUUID"))
                .setHeader(WorkflowProcessor.HEADER_FORMAT, constant("JSON"))
                .to("http:" + properties.getRest().getExternalApiUrl().replace("https://", "").replace("http://", ""))
                .process("executionInitProcessor")
                .to("direct:integration-pipeline");
    }
}
