package com.nexi.connectx.processors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexi.connectx.model.ProcessedRecord;
import com.nexi.connectx.monitoring.WorkflowTrackingService;
import com.nexi.connectx.notifications.NotificationService;
import com.nexi.connectx.repository.ProcessedRecordRepository;
import com.nexi.connectx.transformers.TransformationService;
import com.nexi.connectx.validators.ValidationService;
import lombok.RequiredArgsConstructor;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("workflowProcessor")
@RequiredArgsConstructor
public class WorkflowProcessor implements Processor {

    public static final String HEADER_EXECUTION_ID = "NexiExecutionId";
    public static final String HEADER_WORKFLOW_ID = "NexiWorkflowId";
    public static final String HEADER_FORMAT = "NexiFormat";
    public static final String HEADER_ROUTE_ID = "NexiRouteId";
    public static final String HEADER_SOURCE_TYPE = "NexiSourceType";

    private final TransformationService transformationService;
    private final ValidationService validationService;
    private final ProcessedRecordRepository processedRecordRepository;
    private final WorkflowTrackingService workflowTrackingService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @Override
    public void process(Exchange exchange) throws Exception {
        long start = System.currentTimeMillis();
        Long executionId = exchange.getIn().getHeader(HEADER_EXECUTION_ID, Long.class);
        String workflowId = exchange.getIn().getHeader(HEADER_WORKFLOW_ID, String.class);
        String format = exchange.getIn().getHeader(HEADER_FORMAT, String.class);
        String body = exchange.getIn().getBody(String.class);

        try {
            String transformed = transformationService.transform(body, format);
            validationService.validate(transformed);
            persistRecords(workflowId, transformed);
            exchange.getIn().setBody(transformed);

            long elapsed = System.currentTimeMillis() - start;
            workflowTrackingService.completeSuccess(executionId, body, transformed, elapsed);
            notificationService.sendSuccessNotification(workflowId, exchange.getIn().getHeader(HEADER_ROUTE_ID, String.class));
        } catch (Exception e) {
            workflowTrackingService.completeFailure(executionId, e.getMessage(), false);
            notificationService.sendFailureNotification(workflowId, e.getMessage());
            throw e;
        }
    }

    private void persistRecords(String workflowId, String json) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        if (root.isArray()) {
            for (JsonNode node : root) {
                saveRecord(workflowId, node);
            }
        } else {
            saveRecord(workflowId, root);
        }
    }

    private void saveRecord(String workflowId, JsonNode node) {
        processedRecordRepository.save(ProcessedRecord.builder()
                .workflowId(workflowId)
                .recordType(node.path("type").asText("GENERAL"))
                .externalId(node.path("id").asText(UUID.randomUUID().toString()))
                .payload(node.toString())
                .build());
    }
}
