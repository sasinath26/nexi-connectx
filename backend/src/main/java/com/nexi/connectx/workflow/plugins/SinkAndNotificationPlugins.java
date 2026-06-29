package com.nexi.connectx.workflow.plugins;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexi.connectx.config.NexiConnectXProperties;
import com.nexi.connectx.model.ProcessedRecord;
import com.nexi.connectx.notifications.NotificationService;
import com.nexi.connectx.repository.ProcessedRecordRepository;
import com.nexi.connectx.workflow.engine.WorkflowExecutionContext;
import com.nexi.connectx.workflow.engine.WorkflowPluginExecutor;
import com.nexi.connectx.workflow.model.PluginType;
import com.nexi.connectx.workflow.model.WorkflowNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.camel.ProducerTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

// ── DB Insert ─────────────────────────────────────────────────────────────

@Component
@RequiredArgsConstructor
@Slf4j
class DbInsertPlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private final ProcessedRecordRepository processedRecordRepository;
    private final ObjectMapper objectMapper;
    private final DataSource dataSource;

    @Override
    public PluginType getPluginType() { return PluginType.DB_INSERT; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        Map<String, Object> cfg = context.getNodeConfig(node);

        // --- table / insert settings (read from node configJson) ---
        String tableName         = str(cfg, "tableName", "").trim();
        String insertMode        = str(cfg, "insertMode", "INSERT");
        int    batchSize         = intVal(cfg, "batchSize", 100);
        boolean rollback         = boolVal(cfg, "rollbackOnFail", true);
        boolean autoCommit       = boolVal(cfg, "autoCommit", true);
        String duplicateHandling = str(cfg, "duplicateHandling", "IGNORE");

        // Column mapping: JSON field → DB column  (e.g. {"employeeId":"employee_id",...})
        Map<String, String> columnMapping = parseMap(cfg.get("columnMapping"));

        // Parse payload
        String payload = context.getPayload();
        if (payload == null || payload.isBlank() || payload.equals("[]") || payload.equals("{}")) {
            throw new IllegalStateException("[DbInsert] Payload is empty – nothing to insert");
        }

        JsonNode root = objectMapper.readTree(payload);
        List<JsonNode> records = new ArrayList<>();
        if (root.isArray()) { root.forEach(records::add); }
        else                { records.add(root); }

        if (records.isEmpty()) {
            throw new IllegalStateException("[DbInsert] No records found in payload");
        }

        // Resolve full table name — prefix schema if not already present
        String fullTable = resolveTableName(tableName);

        log.info("[DbInsert] {} records → table='{}' mode={} columns={}",
                records.size(), fullTable, insertMode, columnMapping);

        // Always use Spring's own DataSource (configured in application.yml)
        // This avoids any separate connection attempt errors
        log.info("[DbInsert] Using Spring DataSource (app DB: {})", fullTable);
        try (Connection conn = dataSource.getConnection()) {
            doInsert(conn, records, fullTable, insertMode, columnMapping,
                    batchSize, autoCommit, rollback, duplicateHandling, context);
        }
    }

    /**
     * Prefix with nexi_connectx schema if not already qualified.
     */
    private String resolveTableName(String tableName) {
        if (tableName == null || tableName.isBlank()) {
            throw new IllegalArgumentException("[DbInsert] tableName must be configured in node properties");
        }
        // already schema-qualified?
        if (tableName.contains(".")) return tableName;
        return "nexi_connectx." + tableName;
    }

    // ── Core insert ───────────────────────────────────────────────────────

    private void doInsert(Connection conn, List<JsonNode> records,
                          String tableName, String insertMode,
                          Map<String, String> columnMapping,
                          int batchSize, boolean autoCommit, boolean rollback,
                          String duplicateHandling,
                          WorkflowExecutionContext context) throws Exception {
        conn.setAutoCommit(autoCommit);
        try {
            List<JsonNode> batch = new ArrayList<>();
            int inserted = 0;
            for (JsonNode rec : records) {
                batch.add(rec);
                if (batch.size() >= batchSize) {
                    inserted += flushBatch(conn, batch, tableName, insertMode, columnMapping, duplicateHandling);
                    batch.clear();
                    if (!autoCommit) conn.commit();
                }
            }
            if (!batch.isEmpty()) {
                inserted += flushBatch(conn, batch, tableName, insertMode, columnMapping, duplicateHandling);
            }
            if (!autoCommit) conn.commit();
            log.info("[DbInsert] Successfully inserted {} records into {}", inserted, tableName);
            context.setVariable("dbInsertCount", inserted);
        } catch (Exception e) {
            log.error("[DbInsert] Insert failed: {}", e.getMessage());
            if (rollback && !autoCommit) { try { conn.rollback(); } catch (Exception ignored) {} }
            throw e;
        }
    }

    private int flushBatch(Connection conn, List<JsonNode> batch, String tableName,
                           String insertMode, Map<String, String> columnMapping,
                           String duplicateHandling) throws Exception {
        if (batch.isEmpty()) return 0;

        JsonNode first = batch.get(0);
        List<String> jsonFields = new ArrayList<>();
        List<String> dbColumns  = new ArrayList<>();

        if (columnMapping.isEmpty()) {
            Iterator<String> names = first.fieldNames();
            while (names.hasNext()) {
                String f = names.next();
                jsonFields.add(f);
                dbColumns.add(f);
            }
        } else {
            columnMapping.forEach((jf, dc) -> { jsonFields.add(jf); dbColumns.add(dc); });
        }

        if (dbColumns.isEmpty()) {
            throw new IllegalStateException("[DbInsert] No columns resolved — check columnMapping config");
        }

        String colList      = String.join(", ", dbColumns);
        String placeholders = String.join(", ", Collections.nCopies(dbColumns.size(), "?"));
        String sql;

        if ("UPSERT".equalsIgnoreCase(insertMode)) {
            String firstCol = dbColumns.get(0);
            String updates  = dbColumns.stream()
                    .filter(c -> !c.equals(firstCol))
                    .map(c -> c + " = EXCLUDED." + c)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse(firstCol + " = EXCLUDED." + firstCol);
            sql = "INSERT INTO " + tableName + " (" + colList + ") VALUES (" + placeholders
                    + ") ON CONFLICT (" + firstCol + ") DO UPDATE SET " + updates;
        } else if ("UPDATE".equalsIgnoreCase(insertMode)) {
            String firstCol  = dbColumns.get(0);
            String setClause = dbColumns.stream()
                    .filter(c -> !c.equals(firstCol))
                    .map(c -> c + " = ?")
                    .reduce((a, b) -> a + ", " + b)
                    .orElse(firstCol + " = ?");
            sql = "UPDATE " + tableName + " SET " + setClause + " WHERE " + firstCol + " = ?";
        } else {
            String conflict = "IGNORE".equalsIgnoreCase(duplicateHandling) ? " ON CONFLICT DO NOTHING" : "";
            sql = "INSERT INTO " + tableName + " (" + colList + ") VALUES (" + placeholders + ")" + conflict;
        }

        log.debug("[DbInsert] SQL: {}", sql);

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (JsonNode rec : batch) {
                for (int i = 0; i < jsonFields.size(); i++) {
                    JsonNode val = rec.get(jsonFields.get(i));
                    if (val == null || val.isNull()) {
                        ps.setNull(i + 1, Types.VARCHAR);
                    } else if (val.isNumber()) {
                        ps.setBigDecimal(i + 1, val.decimalValue());
                    } else {
                        ps.setString(i + 1, val.asText());
                    }
                }
                ps.addBatch();
            }
            int[] counts = ps.executeBatch();
            int total = 0;
            for (int c : counts) total += Math.max(c, 0);
            return total;
        }
    }

    private void insertViaRepository(List<JsonNode> records, WorkflowExecutionContext context) {
        log.info("[DbInsert] Fallback: using ProcessedRecord repository");
        for (JsonNode item : records) {
            processedRecordRepository.save(ProcessedRecord.builder()
                    .workflowId(context.getExecutionId())
                    .recordType(item.path("type").asText("GENERAL"))
                    .externalId(item.path("id").asText(UUID.randomUUID().toString()))
                    .payload(item.toString())
                    .build());
        }
        context.setVariable("dbInsertCount", records.size());
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private String str(Map<String, Object> cfg, String key, String def) {
        Object v = cfg.get(key); return v != null ? v.toString() : def;
    }

    private int intVal(Map<String, Object> cfg, String key, int def) {
        try { return cfg.containsKey(key) ? Integer.parseInt(cfg.get(key).toString()) : def; }
        catch (NumberFormatException e) { return def; }
    }

    private boolean boolVal(Map<String, Object> cfg, String key, boolean def) {
        if (!cfg.containsKey(key)) return def;
        return "true".equalsIgnoreCase(cfg.get(key).toString());
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseMap(Object raw) {
        if (raw == null) return new LinkedHashMap<>();
        try {
            if (raw instanceof Map) return (Map<String, String>) raw;
            String s = raw.toString().trim();
            if (s.isBlank() || s.equals("{}")) return new LinkedHashMap<>();
            if (s.startsWith("{")) return objectMapper.readValue(s, new TypeReference<>() {});
            Map<String, String> m = new LinkedHashMap<>();
            for (String pair : s.split(",")) {
                String[] kv = pair.split("[→>]", 2);
                if (kv.length == 2 && !kv[0].trim().isEmpty()) m.put(kv[0].trim(), kv[1].trim());
            }
            return m;
        } catch (Exception e) { return new LinkedHashMap<>(); }
    }
}

// ── Kafka Publish ─────────────────────────────────────────────────────────

@Component
@RequiredArgsConstructor
class KafkaPublishPlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private final ProducerTemplate producerTemplate;
    private final NexiConnectXProperties properties;

    @Override
    public PluginType getPluginType() { return PluginType.KAFKA_PUBLISH; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        String topic = configString(context, node, "topic", properties.getKafka().getProducerTopic());
        String uri   = "kafka:" + topic + "?brokers=" + properties.getKafka().getBootstrapServers();
        producerTemplate.sendBody(uri, context.getPayload());
    }
}

// ── Email Notification ────────────────────────────────────────────────────

@Component
@RequiredArgsConstructor
class EmailNotificationPlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private final NotificationService notificationService;

    @Override
    public PluginType getPluginType() { return PluginType.EMAIL_NOTIFICATION; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        notificationService.sendSuccessNotification(
                context.getExecutionId(),
                "workflow-" + context.getWorkflowDefinitionId() + "/" + node.getNodeKey());
    }
}

// ── Slack Notification ────────────────────────────────────────────────────

@Component
@RequiredArgsConstructor
class SlackNotificationPlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private final NotificationService notificationService;

    @Override
    public PluginType getPluginType() { return PluginType.SLACK_NOTIFICATION; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        String message = configString(context, node, "message",
                "Workflow " + context.getWorkflowCode() + " completed node " + node.getLabel());
        notificationService.sendFailureNotification(context.getExecutionId(), message);
    }
}
