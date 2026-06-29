package com.nexi.connectx.routes;

import com.nexi.connectx.config.NexiConnectXProperties;
import com.nexi.connectx.processors.WorkflowProcessor;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

@Component
public class FileIngestionRoute extends RouteBuilder {

    private final NexiConnectXProperties properties;

    public FileIngestionRoute(NexiConnectXProperties properties) {
        this.properties = properties;
    }

    @Override
    public void configure() {
        errorHandler(deadLetterChannel("direct:error-handler")
                .maximumRedeliveries(properties.getRetry().getMaxAttempts())
                .redeliveryDelay(properties.getRetry().getDelayMs())
                .retryAttemptedLogLevel(org.apache.camel.LoggingLevel.WARN));

        from("file:" + properties.getFile().getInputDir()
                + "?includeExt=csv,xml,json&noop=true&idempotent=false&readLock=changed")
                .routeId("file-ingestion-route")
                .setHeader(WorkflowProcessor.HEADER_ROUTE_ID, constant("file-ingestion-route"))
                .setHeader(WorkflowProcessor.HEADER_SOURCE_TYPE, constant("FILE"))
                .process("executionInitProcessor")
                .process("formatDetectionProcessor")
                .to("direct:integration-pipeline")
                .log("File processed: ${header.CamelFileName}");
    }
}
