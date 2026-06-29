package com.nexi.connectx.workflow.controller;

import com.nexi.connectx.workflow.dto.WorkflowDefinitionRequest;
import com.nexi.connectx.workflow.engine.WorkflowExecutionContext;
import com.nexi.connectx.workflow.engine.WorkflowOrchestrationService;
import com.nexi.connectx.workflow.engine.WorkflowPluginRegistry;
import com.nexi.connectx.workflow.model.WorkflowDefinition;
import com.nexi.connectx.workflow.service.WorkflowDefinitionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/workflow-definitions")
@RequiredArgsConstructor
@Tag(name = "Workflow Definitions", description = "Dynamic workflow design and execution")
public class WorkflowDefinitionController {

    private final WorkflowDefinitionService workflowDefinitionService;
    private final WorkflowPluginRegistry pluginRegistry;
    private final WorkflowOrchestrationService orchestrationService;

    @GetMapping
    @Operation(summary = "List all workflow definitions")
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(workflowDefinitionService.findAll());
    }

    @GetMapping("/plugins")
    @Operation(summary = "List available workflow plugins")
    public ResponseEntity<?> plugins() {
        return ResponseEntity.ok(pluginRegistry.getAvailablePlugins());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get workflow definition with nodes and edges")
    public ResponseEntity<WorkflowDefinition> get(@PathVariable Long id) {
        return ResponseEntity.ok(workflowDefinitionService.findByIdWithGraph(id));
    }

    @PostMapping
    @Operation(summary = "Create a new workflow definition")
    public ResponseEntity<WorkflowDefinition> create(@RequestBody WorkflowDefinitionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workflowDefinitionService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update workflow definition")
    public ResponseEntity<WorkflowDefinition> update(@PathVariable Long id,
                                                     @RequestBody WorkflowDefinitionRequest request) {
        return ResponseEntity.ok(workflowDefinitionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete workflow definition")
    public ResponseEntity<Void> delete(@PathVariable Long id) throws Exception {
        workflowDefinitionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @Operation(summary = "Activate workflow and deploy Camel route")
    public ResponseEntity<WorkflowDefinition> activate(@PathVariable Long id) {
        return ResponseEntity.ok(workflowDefinitionService.activate(id));
    }

    @PostMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate workflow and undeploy Camel route")
    public ResponseEntity<WorkflowDefinition> deactivate(@PathVariable Long id) throws Exception {
        return ResponseEntity.ok(workflowDefinitionService.deactivate(id));
    }

    @PostMapping("/{id}/deploy")
    @Operation(summary = "Deploy Camel route for workflow")
    public ResponseEntity<?> deploy(@PathVariable Long id) {
        workflowDefinitionService.deploy(id);
        return ResponseEntity.ok(Map.of("status", "deployed", "workflowId", id));
    }

    /**
     * Execute a workflow regardless of its ACTIVE/DRAFT status.
     * This is used by the UI Run button.
     */
    @PostMapping("/{id}/run")
    @Operation(summary = "Run workflow directly (no active status required)")
    public ResponseEntity<?> run(@PathVariable Long id) {
        try {
            WorkflowExecutionContext ctx = orchestrationService.executeAny(id, "[]");
            return ResponseEntity.ok(Map.of(
                    "executionId",  ctx.getExecutionId(),
                    "workflowCode", ctx.getWorkflowCode(),
                    "status",       "completed",
                    "nodeOutputs",  ctx.getNodeOutputs()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "status", "failed",
                        "error",  e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()
                    ));
        }
    }

    @PostMapping("/{id}/execute")
    @Operation(summary = "Execute workflow manually (requires ACTIVE status)")
    public ResponseEntity<?> execute(@PathVariable Long id, @RequestBody(required = false) String payload) throws Exception {
        WorkflowExecutionContext context = workflowDefinitionService.execute(id, payload);
        return ResponseEntity.accepted().body(Map.of(
                "executionId", context.getExecutionId(),
                "workflowCode", context.getWorkflowCode(),
                "status", "completed"
        ));
    }

    @GetMapping("/executions/{executionId}/nodes")
    @Operation(summary = "Get per-node execution details")
    public ResponseEntity<?> nodeExecutions(@PathVariable String executionId) {
        return ResponseEntity.ok(workflowDefinitionService.getNodeExecutions(executionId));
    }
}
