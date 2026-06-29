package com.nexi.connectx.config;

import com.nexi.connectx.workflow.model.*;
import com.nexi.connectx.workflow.repository.WorkflowDefinitionRepository;
import com.nexi.connectx.workflow.service.WorkflowDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(2)
@RequiredArgsConstructor
public class WorkflowSampleDataInitializer implements CommandLineRunner {

    private final WorkflowDefinitionRepository repository;
    private final WorkflowDefinitionService workflowDefinitionService;

    @Override
    public void run(String... args) {
        if (repository.findByCode("file-csv-db").isEmpty()) {
            seedWorkflow1();
        }
        if (repository.findByCode("rest-validate-kafka-email").isEmpty()) {
            seedWorkflow2();
        }
        if (repository.findByCode("kafka-enrich-notify").isEmpty()) {
            seedWorkflow3();
        }
        if (repository.findByCode("logs-parallel-sql-summary").isEmpty()) {
            seedWorkflow4();
        }
    }

    private void seedWorkflow1() {
        WorkflowDefinition wf = WorkflowDefinition.builder()
                .code("file-csv-db")
                .name("File Upload → CSV → DB")
                .description("Workflow 1: File ingestion with CSV transformation and database insert")
                .status(WorkflowDefinitionStatus.ACTIVE)
                .version(1)
                .triggerNodeKey("n1")
                .build();

        wf.getNodes().add(node(wf, "n1", "File Upload", PluginType.FILE_UPLOAD,
                "{\"inputDir\":\"./data/input\"}", 80, 120));
        wf.getNodes().add(node(wf, "n2", "CSV Transform", PluginType.CSV_TRANSFORM, "{}", 280, 120));
        wf.getNodes().add(node(wf, "n3", "DB Insert", PluginType.DB_INSERT, "{}", 480, 120));

        wf.getEdges().add(edge(wf, "n1", "n2", null));
        wf.getEdges().add(edge(wf, "n2", "n3", null));

        repository.save(wf);
        workflowDefinitionService.deploy(wf.getId());
    }

    private void seedWorkflow2() {
        WorkflowDefinition wf = WorkflowDefinition.builder()
                .code("rest-validate-kafka-email")
                .name("REST → Validate → Kafka → Email")
                .description("Workflow 2: REST API with validation, Kafka publish, and email notification")
                .status(WorkflowDefinitionStatus.ACTIVE)
                .version(1)
                .triggerNodeKey("n1")
                .build();

        wf.getNodes().add(node(wf, "n1", "Manual Trigger", PluginType.MANUAL_TRIGGER, "{}", 80, 120));
        wf.getNodes().add(node(wf, "n2", "JSON Validate", PluginType.JSON_VALIDATE, "{}", 280, 120));
        wf.getNodes().add(node(wf, "n3", "Kafka Publish", PluginType.KAFKA_PUBLISH,
                "{\"topic\":\"nexi-connectx-outbound\"}", 480, 120));
        wf.getNodes().add(node(wf, "n4", "Email Notify", PluginType.EMAIL_NOTIFICATION,
                "{\"subject\":\"Workflow completed\"}", 680, 120));

        wf.getEdges().add(edge(wf, "n1", "n2", null));
        wf.getEdges().add(edge(wf, "n2", "n3", null));
        wf.getEdges().add(edge(wf, "n3", "n4", null));

        repository.save(wf);
    }

    private void seedWorkflow3() {
        WorkflowDefinition wf = WorkflowDefinition.builder()
                .code("kafka-enrich-notify")
                .name("Kafka → Enrich → Parallel → Slack")
                .description("Workflow 3: Kafka consumer with enrichment, parallel processing, Slack notification")
                .status(WorkflowDefinitionStatus.DRAFT)
                .version(1)
                .triggerNodeKey("n1")
                .build();

        wf.getNodes().add(node(wf, "n1", "Kafka Consumer", PluginType.KAFKA_CONSUMER,
                "{\"topic\":\"nexi-connectx-inbound\"}", 80, 120));
        wf.getNodes().add(node(wf, "n2", "Data Enrich", PluginType.DATA_ENRICH,
                "{\"region\":\"US-EAST\"}", 280, 120));
        wf.getNodes().add(node(wf, "n3", "Parallel Split", PluginType.PARALLEL_SPLIT, "{}", 480, 80));
        wf.getNodes().add(node(wf, "n4", "JSON Validate", PluginType.JSON_VALIDATE, "{}", 680, 40));
        wf.getNodes().add(node(wf, "n5", "DB Insert", PluginType.DB_INSERT, "{}", 680, 160));
        wf.getNodes().add(node(wf, "n6", "Parallel Join", PluginType.PARALLEL_JOIN, "{}", 880, 120));
        wf.getNodes().add(node(wf, "n7", "Slack Notify", PluginType.SLACK_NOTIFICATION,
                "{\"message\":\"Workflow 3 completed\"}", 1080, 120));

        wf.getEdges().add(edge(wf, "n1", "n2", null));
        wf.getEdges().add(edge(wf, "n2", "n3", null));
        wf.getEdges().add(edge(wf, "n3", "n4", null));
        wf.getEdges().add(edge(wf, "n3", "n5", null));
        wf.getEdges().add(edge(wf, "n4", "n6", null));
        wf.getEdges().add(edge(wf, "n5", "n6", null));
        wf.getEdges().add(edge(wf, "n6", "n7", null));

        repository.save(wf);
    }

    private void seedWorkflow4() {
        WorkflowDefinition wf = WorkflowDefinition.builder()
                .code("logs-parallel-sql-summary")
                .name("Get Logs → Read Files → SQL + Summary")
                .description("DAG: get-logs fans out to read-file1/read-file2, SQL sinks, and a join summary task")
                .status(WorkflowDefinitionStatus.ACTIVE)
                .version(1)
                .triggerNodeKey("n1")
                .build();

        wf.getNodes().add(node(wf, "n1", "get-logs", PluginType.SHELL_EXEC,
                "{\"command\":\"echo logs-ready\",\"simulate\":true}", 80, 120));
        wf.getNodes().add(node(wf, "n2", "read-file1", PluginType.FILE_READ,
                "{\"path\":\"./data/file1/sample.json\"}", 280, 80));
        wf.getNodes().add(node(wf, "n3", "read-file2", PluginType.FILE_READ,
                "{\"path\":\"./data/file2/sample.json\"}", 280, 160));
        wf.getNodes().add(node(wf, "n4", "output1", PluginType.SQL_EXEC,
                "{\"mode\":\"insert\"}", 480, 40));
        wf.getNodes().add(node(wf, "n5", "output2", PluginType.SQL_EXEC,
                "{\"mode\":\"insert\"}", 480, 200));
        wf.getNodes().add(node(wf, "n6", "output-summary", PluginType.SHELL_EXEC,
                "{\"command\":\"echo summary\",\"simulate\":true}", 680, 120));

        wf.getEdges().add(edge(wf, "n1", "n2", null));
        wf.getEdges().add(edge(wf, "n1", "n3", null));
        wf.getEdges().add(edge(wf, "n2", "n4", null));
        wf.getEdges().add(edge(wf, "n3", "n5", null));
        wf.getEdges().add(edge(wf, "n2", "n6", null));
        wf.getEdges().add(edge(wf, "n3", "n6", null));

        repository.save(wf);
        workflowDefinitionService.deploy(wf.getId());
    }

    private WorkflowNode node(WorkflowDefinition wf, String key, String label, PluginType type,
                              String config, int x, int y) {
        return WorkflowNode.builder()
                .workflow(wf)
                .nodeKey(key)
                .label(label)
                .pluginType(type)
                .configJson(config)
                .positionX(x)
                .positionY(y)
                .build();
    }

    private WorkflowEdge edge(WorkflowDefinition wf, String from, String to, String condition) {
        return WorkflowEdge.builder()
                .workflow(wf)
                .sourceNodeKey(from)
                .targetNodeKey(to)
                .conditionExpression(condition)
                .build();
    }
}
