package com.nexi.connectx.controller;

import com.nexi.connectx.model.WorkflowExecution;
import com.nexi.connectx.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/workflow-monitoring")
@RequiredArgsConstructor
@Tag(name = "Workflow Monitoring", description = "Execution history and logs as JSON")
public class WorkflowMonitoringController {

    private final DashboardService dashboardService;

    @GetMapping("/history")
    @Operation(summary = "Get workflow execution history (JSON)")
    public ResponseEntity<List<WorkflowExecution>> getHistory(
            @RequestParam(required = false) Long workflowDefinitionId,
            @RequestParam(required = false) String workflowCode) {
        return ResponseEntity.ok(dashboardService.getExecutionHistory(workflowDefinitionId, workflowCode));
    }

    @GetMapping("/logs")
    @Operation(summary = "Get execution logs (JSON)")
    public ResponseEntity<?> getLogs(@RequestParam(required = false) String workflowId) {
        return ResponseEntity.ok(dashboardService.getExecutionLogs(workflowId));
    }
}
