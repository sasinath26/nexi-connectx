package com.nexi.connectx.routes;

import com.nexi.connectx.config.NexiConnectXProperties;
import com.nexi.connectx.monitoring.WorkflowTrackingService;
import com.nexi.connectx.notifications.NotificationService;
import com.nexi.connectx.processors.WorkflowProcessor;
import org.apache.camel.Exchange;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

@Component
public class ErrorHandlingRoute extends RouteBuilder {

    private final NexiConnectXProperties properties;
    private final WorkflowTrackingService workflowTrackingService;
    private final NotificationService notificationService;

    public ErrorHandlingRoute(NexiConnectXProperties properties,
                              WorkflowTrackingService workflowTrackingService,
                              NotificationService notificationService) {
        this.properties = properties;
        this.workflowTrackingService = workflowTrackingService;
        this.notificationService = notificationService;
    }

    @Override
    public void configure() {
        from("direct:error-handler")
                .routeId("error-handler-route")
                .process(exchange -> {
                    Long executionId = exchange.getIn().getHeader(WorkflowProcessor.HEADER_EXECUTION_ID, Long.class);
                    String workflowId = exchange.getIn().getHeader(WorkflowProcessor.HEADER_WORKFLOW_ID, String.class);
                    Exception cause = exchange.getProperty(Exchange.EXCEPTION_CAUGHT, Exception.class);
                    String error = cause != null ? cause.getMessage() : "Unknown error";

                    if (executionId != null) {
                        workflowTrackingService.markRetrying(executionId);
                        Integer redelivery = exchange.getIn().getHeader(Exchange.REDELIVERY_COUNTER, Integer.class);
                        int max = properties.getRetry().getMaxAttempts();
                        if (redelivery != null && redelivery >= max) {
                            workflowTrackingService.completeFailure(executionId, error, true);
                            notificationService.sendFailureNotification(workflowId, error);
                        }
                    }
                })
                .to("kafka:" + properties.getKafka().getDlqTopic()
                        + "?brokers=" + properties.getKafka().getBootstrapServers())
                .log("Message sent to DLQ: ${body}");
    }
}
