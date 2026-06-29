package com.nexi.connectx.controller;

import com.nexi.connectx.service.DashboardService;
import com.nexi.connectx.service.WorkflowFileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.apache.camel.Exchange;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.nio.file.Path;
import java.util.Map;
import java.util.Objects;

/**
 * Exposes Workflow endpoints via Apache Camel REST DSL.
 *
 * Endpoints:
 *   POST  /api/workflows/upload   — upload file into workflow upload folder
 *   GET   /api/workflows/history  — get execution history
 *   GET   /api/workflows/logs     — get execution logs (optional ?workflowId=)
 *   POST  /api/workflows/trigger  — trigger workflow
 */
@Component
@RequiredArgsConstructor
public class WorkflowController extends RouteBuilder {

    private final DashboardService dashboardService;
    private final WorkflowFileStorageService workflowFileStorageService;

    @Override
    public void configure() {

        // ── REST DSL Declaration ──────────────────────────────────────────
        rest("/api/workflows")
            .tag("Workflows")
            .description("Workflow execution and history APIs")

            // POST /api/workflows/upload
            .post("/upload")
                .consumes("multipart/form-data")
                .produces("application/json")
                .description("Upload a file into the workflow's upload folder. " +
                             "Saves to ./workflows/{workflowName}/upload/{filename}. " +
                             "Does NOT process the file — workflow execution handles that.")
                .to("direct:workflow-upload")

            // GET /api/workflows/history
            .get("/history")
                .produces("application/json")
                .description("Get workflow execution history")
                .to("direct:workflow-history")

            // GET /api/workflows/logs
            .get("/logs")
                .produces("application/json")
                .description("Get execution logs, optionally filtered by workflowId")
                .param().name("workflowId").type(org.apache.camel.model.rest.RestParamType.query)
                        .required(false).description("Filter logs by workflow execution ID").endParam()
                .to("direct:workflow-logs")

            // POST /api/workflows/trigger
            .post("/trigger")
                .consumes("application/json")
                .produces("application/json")
                .description("Trigger workflow via REST (delegates to Camel integration pipeline)")
                .to("direct:workflow-trigger");

        // ── Route: File Upload ────────────────────────────────────────────
        from("direct:workflow-upload")
            .routeId("workflow-upload-route")
            .process(exchange -> {
                HttpServletRequest httpRequest =
                        exchange.getIn().getBody(HttpServletRequest.class);

                // workflowName — from header or request param
                String workflowName = exchange.getIn().getHeader("workflowName", String.class);
                if ((workflowName == null || workflowName.isBlank()) && httpRequest != null) {
                    workflowName = httpRequest.getParameter("workflowName");
                }

                if (workflowName == null || workflowName.isBlank()) {
                    exchange.getMessage().setHeader(Exchange.HTTP_RESPONSE_CODE, 400);
                    exchange.getMessage().setBody(
                            Map.of("error", "workflowName must not be blank"));
                    return;
                }

                // file — from multipart request
                if (!(httpRequest instanceof MultipartHttpServletRequest multipartRequest)) {
                    exchange.getMessage().setHeader(Exchange.HTTP_RESPONSE_CODE, 400);
                    exchange.getMessage().setBody(
                            Map.of("error", "Request must be multipart/form-data"));
                    return;
                }

                MultipartFile file = multipartRequest.getFile("file");
                if (file == null || file.isEmpty()) {
                    exchange.getMessage().setHeader(Exchange.HTTP_RESPONSE_CODE, 400);
                    exchange.getMessage().setBody(
                            Map.of("error", "file must not be empty"));
                    return;
                }

                try {
                    Path saved = workflowFileStorageService.saveToUploadFolder(workflowName, file);
                    exchange.getMessage().setHeader(Exchange.HTTP_RESPONSE_CODE, 200);
                    exchange.getMessage().setBody(Map.of(
                            "status",       "uploaded",
                            "workflowName", workflowName,
                            "fileName",     Objects.toString(file.getOriginalFilename(), "unknown"),
                            "savedPath",    saved.toAbsolutePath().toString(),
                            "message",      "File stored in upload folder. " +
                                            "Trigger workflow execution to process it."
                    ));
                } catch (Exception e) {
                    exchange.getMessage().setHeader(Exchange.HTTP_RESPONSE_CODE, 500);
                    exchange.getMessage().setBody(Map.of(
                            "error",  "Failed to upload file",
                            "detail", e.getMessage()
                    ));
                }
            });

        // ── Route: Execution History ──────────────────────────────────────
        from("direct:workflow-history")
            .routeId("workflow-history-route")
            .process(exchange ->
                exchange.getMessage().setBody(dashboardService.getExecutionHistory())
            );

        // ── Route: Execution Logs ─────────────────────────────────────────
        from("direct:workflow-logs")
            .routeId("workflow-logs-route")
            .process(exchange -> {
                String workflowId = exchange.getIn().getHeader("workflowId", String.class);
                exchange.getMessage().setBody(dashboardService.getExecutionLogs(workflowId));
            });

        // ── Route: Trigger ────────────────────────────────────────────────
        from("direct:workflow-trigger")
            .routeId("workflow-trigger-route")
            .process(exchange ->
                exchange.getMessage().setBody(Map.of(
                        "status",  "accepted",
                        "message", "Use POST /integration/trigger for Camel REST endpoint",
                        "payload", Objects.toString(exchange.getIn().getBody(), "{}")
                ))
            );
    }
}
