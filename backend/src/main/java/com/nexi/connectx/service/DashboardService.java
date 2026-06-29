package com.nexi.connectx.service;

import com.nexi.connectx.model.ExecutionLog;
import com.nexi.connectx.model.WorkflowExecution;
import com.nexi.connectx.monitoring.HealthCheckService;
import com.nexi.connectx.monitoring.WorkflowTrackingService;
import com.nexi.connectx.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.camel.CamelContext;
import org.apache.camel.Route;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final WorkflowTrackingService workflowTrackingService;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final RouteMetricRepository routeMetricRepository;
    private final PluginConfigurationRepository pluginConfigurationRepository;
    private final HealthCheckService healthCheckService;
    private final CamelContext camelContext;

    public Map<String, Object> getDashboard() {
        Map<String, Object> dashboard = workflowTrackingService.getDashboardSummary();
        dashboard.put("health", healthCheckService.getHealthStatus());
        dashboard.put("routes", getRouteStatuses());
        return dashboard;
    }

    public List<Map<String, Object>> getRouteStatuses() {
        List<Map<String, Object>> routes = new ArrayList<>();
        for (Route route : camelContext.getRoutes()) {
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("routeId", route.getId());
            info.put("endpoint", route.getEndpoint().getEndpointUri());
            info.put("status", camelContext.getRouteController().getRouteStatus(route.getId()).name());
            routeMetricRepository.findByRouteId(route.getId())
                    .ifPresent(metric -> info.put("metrics", metric));
            routes.add(info);
        }
        return routes;
    }

    public List<WorkflowExecution> getExecutionHistory() {
        return getExecutionHistory(null);
    }

    public List<WorkflowExecution> getExecutionHistory(Long workflowDefinitionId) {
        return getExecutionHistory(workflowDefinitionId, null);
    }

    public List<WorkflowExecution> getExecutionHistory(Long workflowDefinitionId, String workflowCode) {
        List<WorkflowExecution> all = workflowExecutionRepository.findTop50ByOrderByStartedAtDesc();
        if (workflowDefinitionId == null) {
            return all;
        }
        String routeId = "dynamic-workflow-" + workflowDefinitionId;
        return all.stream()
                .filter(e -> routeId.equals(e.getRouteId())
                        || (workflowCode != null && workflowCode.equals(e.getSourceFile())))
                .toList();
    }

    public List<ExecutionLog> getExecutionLogs(String workflowId) {
        if (workflowId != null && !workflowId.isBlank()) {
            return executionLogRepository.findTop50ByWorkflowIdOrderByTimestampDesc(workflowId);
        }
        return executionLogRepository.findTop100ByOrderByTimestampDesc();
    }

    public List<?> getPluginConfigurations() {
        return pluginConfigurationRepository.findAll();
    }
}
