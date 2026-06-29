package com.nexi.connectx.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SchemaInitializer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS nexi_connectx");
        refreshPluginTypeConstraint();
    }

    private void refreshPluginTypeConstraint() {
        jdbcTemplate.execute(
                "ALTER TABLE nexi_connectx.workflow_node DROP CONSTRAINT IF EXISTS workflow_node_plugin_type_check");
        String[] types = {
                "FILE_UPLOAD", "SFTP_READ", "REST_API", "KAFKA_CONSUMER", "MANUAL_TRIGGER",
                "CSV_TRANSFORM", "XML_TRANSFORM", "JSON_TRANSFORM", "JSON_VALIDATE", "DATA_ENRICH",
                "DB_INSERT", "KAFKA_PUBLISH", "EMAIL_NOTIFICATION", "SLACK_NOTIFICATION",
                "PARALLEL_SPLIT", "PARALLEL_JOIN", "CONDITIONAL_BRANCH",
                "FILE_READ", "SHELL_EXEC", "SQL_EXEC"
        };
        String allowed = String.join(", ", java.util.Arrays.stream(types).map(t -> "'" + t + "'").toList());
        jdbcTemplate.execute(
                "ALTER TABLE nexi_connectx.workflow_node ADD CONSTRAINT workflow_node_plugin_type_check "
                        + "CHECK (plugin_type IN (" + allowed + "))");
    }
}
