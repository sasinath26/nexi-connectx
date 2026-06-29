package com.nexi.connectx.routes;

import com.nexi.connectx.config.NexiConnectXProperties;
import com.nexi.connectx.processors.WorkflowProcessor;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

@Component
public class SftpIngestionRoute extends RouteBuilder {

    private final NexiConnectXProperties properties;

    public SftpIngestionRoute(NexiConnectXProperties properties) {
        this.properties = properties;
    }

    @Override
    public void configure() {
        if (!properties.getSftp().isEnabled()) {
            return;
        }

        from("sftp://" + properties.getSftp().getHost() + ":" + properties.getSftp().getPort()
                + properties.getSftp().getRemoteDir()
                + "?username=" + properties.getSftp().getUsername()
                + "&password=" + properties.getSftp().getPassword()
                + "&download=true&include=.*\\.(csv|xml|json)$")
                .routeId("sftp-ingestion-route")
                .setHeader(WorkflowProcessor.HEADER_ROUTE_ID, constant("sftp-ingestion-route"))
                .setHeader(WorkflowProcessor.HEADER_SOURCE_TYPE, constant("SFTP"))
                .process("executionInitProcessor")
                .process("formatDetectionProcessor")
                .to("direct:integration-pipeline");
    }
}
