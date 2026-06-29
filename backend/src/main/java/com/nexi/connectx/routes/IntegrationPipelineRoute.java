package com.nexi.connectx.routes;

import com.nexi.connectx.config.NexiConnectXProperties;
import com.nexi.connectx.processors.WorkflowProcessor;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

@Component
public class IntegrationPipelineRoute extends RouteBuilder {

    private final NexiConnectXProperties properties;

    public IntegrationPipelineRoute(NexiConnectXProperties properties) {
        this.properties = properties;
    }

    @Override
    public void configure() {
        from("direct:integration-pipeline")
                .routeId("integration-pipeline")
                .process("workflowProcessor")
                .choice()
                    .when(header(WorkflowProcessor.HEADER_FORMAT).isEqualTo("CSV"))
                        .log("Routed CSV payload for workflow ${header.NexiWorkflowId}")
                    .when(header(WorkflowProcessor.HEADER_FORMAT).isEqualTo("XML"))
                        .log("Routed XML payload for workflow ${header.NexiWorkflowId}")
                    .otherwise()
                        .log("Routed JSON payload for workflow ${header.NexiWorkflowId}")
                .end()
                .doTry()
                    .to("kafka:" + properties.getKafka().getProducerTopic()
                            + "?brokers=" + properties.getKafka().getBootstrapServers())
                .doCatch(Exception.class)
                    .log("Kafka publish skipped: ${exception.message}")
                .end();
    }
}
