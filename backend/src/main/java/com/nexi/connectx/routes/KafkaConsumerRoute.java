package com.nexi.connectx.routes;

import com.nexi.connectx.config.NexiConnectXProperties;
import com.nexi.connectx.processors.WorkflowProcessor;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class KafkaConsumerRoute extends RouteBuilder {

    private final NexiConnectXProperties properties;

    public KafkaConsumerRoute(NexiConnectXProperties properties) {
        this.properties = properties;
    }

    @Override
    public void configure() {
        from("kafka:" + properties.getKafka().getConsumerTopic()
                + "?brokers=" + properties.getKafka().getBootstrapServers()
                + "&groupId=" + properties.getKafka().getGroupId()
                + "&autoOffsetReset=earliest")
                .routeId("kafka-consumer-route")
                .autoStartup(false)
                .setHeader(WorkflowProcessor.HEADER_ROUTE_ID, constant("kafka-consumer-route"))
                .setHeader(WorkflowProcessor.HEADER_SOURCE_TYPE, constant("KAFKA"))
                .setHeader(WorkflowProcessor.HEADER_WORKFLOW_ID, method(UUID.class, "randomUUID"))
                .setHeader(WorkflowProcessor.HEADER_FORMAT, constant("JSON"))
                .process("executionInitProcessor")
                .to("direct:integration-pipeline");
    }
}
