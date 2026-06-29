package com.nexi.connectx.monitoring;

import com.nexi.connectx.model.*;
import com.nexi.connectx.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WorkflowTrackingService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowTrackingService.class);

    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final RouteMetricRepository routeMetricRepository;
    private final ExecutionLogRepository executionLogRepository;

    @Transactional
    public WorkflowExecution startExecution(String workflowId, String routeId, String sourceType, String sourceFile) {
        WorkflowExecution execution = WorkflowExecution.builder()
                .workflowId(workflowId)
                .routeId(routeId)
                .sourceType(sourceType)
                .sourceFile(sourceFile)
                .status(ExecutionStatus.RUNNING)
                .startedAt(Instant.now())
                .retryCount(0)
                .build();
        workflowExecutionRepository.save(execution);
        log.info("Started workflow {} on route {}", workflowId, routeId);
        addLog(workflowId, routeId, "INFO", "Workflow started");
        return execution;
    }

    @Transactional
    public void completeSuccess(Long executionId, String payload, String transformedPayload, long processingTimeMs) {
        workflowExecutionRepository.findById(executionId).ifPresent(execution -> {
            execution.setStatus(ExecutionStatus.SUCCESS);
            execution.setPayload(truncate(payload));
            execution.setTransformedPayload(truncate(transformedPayload));
            execution.setProcessingTimeMs(processingTimeMs);
            execution.setCompletedAt(Instant.now());
            workflowExecutionRepository.save(execution);
            updateMetrics(execution.getRouteId(), true, processingTimeMs);
            addLog(execution.getWorkflowId(), execution.getRouteId(), "INFO", "Workflow completed successfully");
        });
    }

    @Transactional
    public void completeFailure(Long executionId, String errorMessage, boolean sendToDlq) {
        workflowExecutionRepository.findById(executionId).ifPresent(execution -> {
            execution.setStatus(sendToDlq ? ExecutionStatus.DLQ : ExecutionStatus.FAILED);
            execution.setErrorMessage(truncate(errorMessage));
            execution.setCompletedAt(Instant.now());
            workflowExecutionRepository.save(execution);
            updateMetrics(execution.getRouteId(), false, 0);
            addLog(execution.getWorkflowId(), execution.getRouteId(), "ERROR", errorMessage);
        });
    }

    @Transactional
    public void markRetrying(Long executionId) {
        workflowExecutionRepository.findById(executionId).ifPresent(execution -> {
            execution.setStatus(ExecutionStatus.RETRYING);
            execution.setRetryCount(execution.getRetryCount() + 1);
            workflowExecutionRepository.save(execution);
            addLog(execution.getWorkflowId(), execution.getRouteId(), "WARN",
                    "Retry attempt " + execution.getRetryCount());
        });
    }

    @Transactional
    public void addLog(String workflowId, String routeId, String level, String message) {
        executionLogRepository.save(ExecutionLog.builder()
                .workflowId(workflowId)
                .routeId(routeId)
                .level(level)
                .message(truncate(message))
                .timestamp(Instant.now())
                .build());
    }

    private void updateMetrics(String routeId, boolean success, long processingTimeMs) {
        RouteMetric metric = routeMetricRepository.findByRouteId(routeId)
                .orElse(RouteMetric.builder()
                        .routeId(routeId)
                        .successCount(0)
                        .failureCount(0)
                        .totalExecutions(0)
                        .avgProcessingTimeMs(0)
                        .build());

        metric.setTotalExecutions(metric.getTotalExecutions() + 1);
        if (success) {
            metric.setSuccessCount(metric.getSuccessCount() + 1);
            double total = metric.getAvgProcessingTimeMs() * (metric.getSuccessCount() - 1) + processingTimeMs;
            metric.setAvgProcessingTimeMs(total / metric.getSuccessCount());
        } else {
            metric.setFailureCount(metric.getFailureCount() + 1);
        }
        routeMetricRepository.save(metric);
    }

    public Map<String, Object> getDashboardSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalExecutions", workflowExecutionRepository.count());
        summary.put("successCount", workflowExecutionRepository.countByStatus(ExecutionStatus.SUCCESS));
        summary.put("failureCount", workflowExecutionRepository.countByStatus(ExecutionStatus.FAILED));
        summary.put("runningCount", workflowExecutionRepository.countByStatus(ExecutionStatus.RUNNING));
        summary.put("retryingCount", workflowExecutionRepository.countByStatus(ExecutionStatus.RETRYING));
        summary.put("dlqCount", workflowExecutionRepository.countByStatus(ExecutionStatus.DLQ));
        summary.put("routeMetrics", routeMetricRepository.findAll());
        return summary;
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() > 4000 ? value.substring(0, 4000) : value;
    }
}
