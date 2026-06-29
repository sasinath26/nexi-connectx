package com.nexi.connectx.workflow.engine;

import com.nexi.connectx.workflow.dto.PluginFieldSchema;
import com.nexi.connectx.workflow.dto.PluginMetadataDto;
import com.nexi.connectx.workflow.model.PluginType;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class WorkflowPluginRegistry {

    private final Map<PluginType, WorkflowPluginExecutor> executors;

    public WorkflowPluginRegistry(List<WorkflowPluginExecutor> executorList) {
        this.executors = executorList.stream()
                .collect(Collectors.toMap(WorkflowPluginExecutor::getPluginType, e -> e));
    }

    public WorkflowPluginExecutor getExecutor(PluginType type) {
        WorkflowPluginExecutor executor = executors.get(type);
        if (executor == null) {
            throw new IllegalArgumentException("No executor registered for plugin: " + type);
        }
        return executor;
    }

    public List<PluginMetadataDto> getAvailablePlugins() {
        List<PluginMetadataDto> plugins = new ArrayList<>();

        // ── Source connectors ────────────────────────────────────────────
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.FILE_UPLOAD).name("File Upload").category("Source")
                .description("Watch folder for file uploads").trigger(true)
                .configFields(List.of("inputDir", "filePattern"))
                .configSchema(List.of(
                        field("taskName",           "Task Name",              "text",     "Basic",         "",      true,  null, "My File Upload"),
                        field("description",        "Description",            "textarea", "Basic",         "",      false, null, ""),
                        field("enabled",            "Enabled",                "checkbox", "Basic",         "true",  false, null, ""),
                        field("inputDir",           "File Path / Input Dir",  "text",     "File Config",   "",      true,  null, "/data/input"),
                        field("filePattern",        "File Name Pattern",      "text",     "File Config",   "*.csv", false, null, "*.csv"),
                        field("uploadType",         "Upload Type",            "select",   "File Config",   "LOCAL", false, List.of("LOCAL","SMB","SFTP"), "LOCAL"),
                        field("fileType",           "File Type",              "select",   "File Format",   "CSV",   false, List.of("CSV","XML","JSON"), "CSV"),
                        field("delimiter",          "Delimiter",              "text",     "File Format",   ",",     false, null, ","),
                        field("hasHeader",          "Has Header Row",         "checkbox", "File Format",   "true",  false, null, ""),
                        field("encoding",           "Encoding",               "text",     "File Format",   "UTF-8", false, null, "UTF-8"),
                        field("pollingInterval",    "Polling Interval (s)",   "number",   "Polling",       "30",    false, null, "30"),
                        field("maxFilesPerPoll",    "Max Files Per Poll",     "number",   "Polling",       "10",    false, null, "10"),
                        field("recursiveScan",      "Recursive Scan",         "checkbox", "Polling",       "false", false, null, ""),
                        field("archiveProcessed",   "Archive Processed File", "checkbox", "Post Process",  "false", false, null, ""),
                        field("archivePath",        "Archive Path",           "text",     "Post Process",  "",      false, null, "/data/archive"),
                        field("deleteAfterProcess", "Delete After Processing","checkbox", "Post Process",  "false", false, null, ""),
                        field("retryCount",         "Retry Count",            "number",   "Error Handling","3",     false, null, "3"),
                        field("retryDelay",         "Retry Delay (ms)",       "number",   "Error Handling","2000",  false, null, "2000"),
                        field("sendFailedToDLQ",    "Send Failed File to DLQ","checkbox", "Error Handling","false", false, null, "")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.SFTP_READ).name("SFTP Read").category("Source")
                .description("Read files from SFTP").trigger(true)
                .configFields(List.of("host", "port", "username", "password", "remoteDir"))
                .configSchema(List.of(
                        field("host",       "SFTP Host",    "text",     "Connection", "",     true,  null, "sftp.example.com"),
                        field("port",       "Port",         "number",   "Connection", "22",   false, null, "22"),
                        field("username",   "Username",     "text",     "Connection", "",     true,  null, ""),
                        field("password",   "Password",     "password", "Connection", "",     true,  null, ""),
                        field("remoteDir",  "Remote Dir",   "text",     "Connection", "/",    false, null, "/upload"),
                        field("filePattern","File Pattern", "text",     "File Config","*.csv",false, null, "*.csv")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.REST_API).name("REST API Call").category("Source")
                .description("Invoke external REST API").trigger(true)
                .configFields(List.of("url", "method"))
                .configSchema(List.of(
                        field("url",    "URL",         "text",   "Connection", "",    true,  null, "https://api.example.com/data"),
                        field("method", "HTTP Method", "select", "Connection", "GET", false, List.of("GET","POST","PUT","DELETE"), "GET")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.KAFKA_CONSUMER).name("Kafka Consumer").category("Source")
                .description("Consume messages from Kafka topic").trigger(true)
                .configFields(List.of("topic", "groupId"))
                .configSchema(List.of(
                        field("topic",   "Topic Name",    "text", "Kafka", "", true,  null, "my-topic"),
                        field("groupId", "Consumer Group","text", "Kafka", "", false, null, "nexi-group")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.MANUAL_TRIGGER).name("Manual Trigger").category("Source")
                .description("Trigger workflow manually via UI/API").trigger(true)
                .configFields(List.of()).configSchema(List.of()).build());

        // ── Transformations ──────────────────────────────────────────────
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.CSV_TRANSFORM).name("CSV Transformation").category("Transform")
                .description("Convert CSV to JSON").trigger(false)
                .configFields(List.of())
                .configSchema(List.of(
                        field("taskName",           "Task Name",                 "text",     "Basic",          "",      false, null, "CSV to JSON"),
                        field("description",        "Description",               "textarea", "Basic",          "",      false, null, ""),
                        field("delimiter",          "Delimiter",                 "text",     "CSV Settings",   ",",     false, null, ","),
                        field("hasHeader",          "Has Header Row",            "checkbox", "CSV Settings",   "true",  false, null, ""),
                        field("encoding",           "Encoding",                  "text",     "CSV Settings",   "UTF-8", false, null, "UTF-8"),
                        field("autoDetectHeaders",  "Auto Detect Headers",       "checkbox", "CSV Settings",   "true",  false, null, ""),
                        field("fieldMapping",       "Field Mapping (CSV→JSON)",  "keyvalue", "Mapping",        "",      false, null, "id→id, name→fullName"),
                        field("integerFields",      "Integer Fields",            "text",     "Data Types",     "",      false, null, "age, count"),
                        field("dateFields",         "Date Fields",               "text",     "Data Types",     "",      false, null, "birthDate, createdAt"),
                        field("booleanFields",      "Boolean Fields",            "text",     "Data Types",     "",      false, null, "active, enabled"),
                        field("ignoreEmptyRows",    "Ignore Empty Rows",         "checkbox", "Transform Rules","true",  false, null, ""),
                        field("trimValues",         "Trim Whitespace",           "checkbox", "Transform Rules","true",  false, null, ""),
                        field("removeSpecialChars", "Remove Special Characters", "checkbox", "Transform Rules","false", false, null, ""),
                        field("jsonOutputStructure","JSON Output Structure",     "select",   "Advanced",       "FLAT",  false, List.of("FLAT","NESTED"), "FLAT"),
                        field("skipInvalidRows",    "Skip Invalid Rows",         "checkbox", "Error Handling", "true",  false, null, "")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.XML_TRANSFORM).name("XML Transformation").category("Transform")
                .description("Convert XML to JSON").trigger(false)
                .configFields(List.of()).configSchema(List.of()).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.JSON_TRANSFORM).name("JSON Mapping").category("Transform")
                .description("Normalize JSON payload").trigger(false)
                .configFields(List.of()).configSchema(List.of()).build());

        // ── Validation ───────────────────────────────────────────────────
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.JSON_VALIDATE).name("JSON Validation").category("Validate")
                .description("Validate mandatory fields and business rules").trigger(false)
                .configFields(List.of())
                .configSchema(List.of(
                        field("taskName",           "Task Name",                    "text",     "Basic",             "",      false, null, "Validation"),
                        field("description",        "Description",                  "textarea", "Basic",             "",      false, null, ""),
                        field("mandatoryFields",    "Mandatory Fields",             "text",     "Validation Rules",  "",      false, null, "id, name, email"),
                        field("emailFields",        "Email Fields",                 "text",     "Validation Rules",  "",      false, null, "email"),
                        field("numericFields",      "Numeric Fields",               "text",     "Validation Rules",  "",      false, null, "age, salary"),
                        field("dateFields",         "Date Fields",                  "text",     "Validation Rules",  "",      false, null, "birthDate"),
                        field("regexRules",         "Regex Rules (field→pattern)",  "keyvalue", "Validation Rules",  "",      false, null, "phone→^\\d{10}$"),
                        field("minLength",          "Min Length (field→length)",    "keyvalue", "Business Rules",    "",      false, null, "name→2"),
                        field("maxLength",          "Max Length (field→length)",    "keyvalue", "Business Rules",    "",      false, null, "name→100"),
                        field("allowedValues",      "Allowed Values (field→vals)",  "keyvalue", "Business Rules",    "",      false, null, "status→ACTIVE,INACTIVE"),
                        field("rejectInvalid",      "Reject Invalid Records",       "checkbox", "Failure Handling",  "true",  false, null, ""),
                        field("continueOnValid",    "Continue Processing Valid",    "checkbox", "Failure Handling",  "true",  false, null, ""),
                        field("storeFailedRecords", "Store Failed Records",         "checkbox", "Failure Handling",  "false", false, null, ""),
                        field("failedRecordDest",   "Failed Record Destination",    "select",   "Failure Handling",  "TABLE", false, List.of("TABLE","FILE","KAFKA"), "TABLE"),
                        field("retryCount",         "Retry Count",                  "number",   "Error Handling",    "0",     false, null, "0"),
                        field("retryDelay",         "Retry Delay (ms)",             "number",   "Error Handling",    "1000",  false, null, "1000")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.DATA_ENRICH).name("Data Enrichment").category("Transform")
                .description("Enrich payload with metadata").trigger(false)
                .configFields(List.of("region"))
                .configSchema(List.of(
                        field("region", "Enrichment Region", "text", "Config", "US-EAST", false, null, "US-EAST")
                )).build());

        // ── Database ─────────────────────────────────────────────────────
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.DB_INSERT).name("Database Insert").category("Sink")
                .description("Persist records to PostgreSQL").trigger(false)
                .configFields(List.of())
                .configSchema(List.of(
                        field("taskName",         "Task Name",               "text",     "Basic",          "",           false, null, "DB Insert"),
                        field("description",      "Description",             "textarea", "Basic",          "",           false, null, ""),
                        field("dbType",           "Database Type",           "select",   "Connection",     "POSTGRESQL", false, List.of("POSTGRESQL","MYSQL","H2"), "POSTGRESQL"),
                        field("host",             "Host",                    "text",     "Connection",     "localhost",  true,  null, "localhost"),
                        field("port",             "Port",                    "number",   "Connection",     "5432",       false, null, "5432"),
                        field("databaseName",     "Database Name",           "text",     "Connection",     "",           true,  null, "mydb"),
                        field("username",         "Username",                "text",     "Connection",     "",           true,  null, "postgres"),
                        field("password",         "Password",                "password", "Connection",     "",           true,  null, ""),
                        field("connectionPool",   "Connection Pool Size",    "number",   "Connection",     "5",          false, null, "5"),
                        field("connTimeout",      "Connection Timeout (ms)", "number",   "Connection",     "30000",      false, null, "30000"),
                        field("sslEnabled",       "SSL Enabled",             "checkbox", "Connection",     "false",      false, null, ""),
                        field("tableName",        "Table Name",              "text",     "Table Config",   "",           true,  null, "customers"),
                        field("insertMode",       "Insert Mode",             "select",   "Table Config",   "INSERT",     false, List.of("INSERT","UPSERT","UPDATE"), "INSERT"),
                        field("columnMapping",    "Column Mapping (JSON→DB)","keyvalue", "Table Config",   "",           false, null, "employeeId→id, fullName→name"),
                        field("batchSize",        "Batch Size",              "number",   "Batch",          "100",        false, null, "100"),
                        field("commitInterval",   "Commit Interval",         "number",   "Batch",          "500",        false, null, "500"),
                        field("duplicateHandling","Duplicate Handling",      "select",   "Duplicates",     "IGNORE",     false, List.of("IGNORE","UPDATE","FAIL"), "IGNORE"),
                        field("autoCommit",       "Auto Commit",             "checkbox", "Transaction",    "true",       false, null, ""),
                        field("rollbackOnFail",   "Rollback on Failure",     "checkbox", "Transaction",    "true",       false, null, ""),
                        field("retryCount",       "Retry Count",             "number",   "Error Handling", "3",          false, null, "3"),
                        field("retryDelay",       "Retry Delay (ms)",        "number",   "Error Handling", "2000",       false, null, "2000")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.SQL_EXEC).name("SQL Execute").category("Sink")
                .description("Run SQL or insert payload records to PostgreSQL").trigger(false)
                .configFields(List.of("sql", "mode"))
                .configSchema(List.of(
                        field("sql",  "SQL Statement",  "textarea", "Config", "",       false, null, "INSERT INTO ..."),
                        field("mode", "Execution Mode", "select",   "Config", "insert", false, List.of("insert","query","update"), "insert")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.KAFKA_PUBLISH).name("Kafka Publish").category("Sink")
                .description("Publish message to Kafka topic").trigger(false)
                .configFields(List.of("topic"))
                .configSchema(List.of(
                        field("topic", "Topic Name", "text", "Kafka", "", true, null, "output-topic")
                )).build());

        // ── Notifications ────────────────────────────────────────────────
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.EMAIL_NOTIFICATION).name("Email Notification").category("Notification")
                .description("Send email alert").trigger(false)
                .configFields(List.of("to", "subject"))
                .configSchema(List.of(
                        field("smtpHost",         "SMTP Host",              "text",     "SMTP",         "",      false, null, "smtp.gmail.com"),
                        field("smtpPort",         "SMTP Port",              "number",   "SMTP",         "587",   false, null, "587"),
                        field("smtpUsername",     "SMTP Username",          "text",     "SMTP",         "",      false, null, ""),
                        field("smtpPassword",     "SMTP Password",          "password", "SMTP",         "",      false, null, ""),
                        field("from",             "From Address",           "text",     "Email",        "",      false, null, "no-reply@company.com"),
                        field("to",               "To Address",             "text",     "Email",        "",      true,  null, "admin@company.com"),
                        field("cc",               "CC",                     "text",     "Email",        "",      false, null, ""),
                        field("subject",          "Subject",                "text",     "Email",        "",      true,  null, "Workflow completed"),
                        field("messageTemplate",  "Message Template",       "textarea", "Email",        "",      false, null, "Workflow {{workflowCode}} completed."),
                        field("onSuccess",        "Notify on Success",      "checkbox", "Triggers",     "true",  false, null, ""),
                        field("onFailure",        "Notify on Failure",      "checkbox", "Triggers",     "true",  false, null, ""),
                        field("onPartialSuccess", "Notify on Partial",      "checkbox", "Triggers",     "false", false, null, ""),
                        field("attachLogs",       "Attach Logs",            "checkbox", "Attachments",  "false", false, null, ""),
                        field("attachFailed",     "Attach Failed Records",  "checkbox", "Attachments",  "false", false, null, "")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.SLACK_NOTIFICATION).name("Slack Notification").category("Notification")
                .description("Send Slack message").trigger(false)
                .configFields(List.of("message"))
                .configSchema(List.of(
                        field("message",    "Message",     "textarea", "Config", "", true,  null, "Workflow completed"),
                        field("webhookUrl", "Webhook URL", "text",     "Config", "", false, null, "https://hooks.slack.com/...")
                )).build());

        // ── Control flow ─────────────────────────────────────────────────
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.PARALLEL_SPLIT).name("Parallel Split").category("Control")
                .description("Execute branches in parallel").trigger(false)
                .configFields(List.of()).configSchema(List.of()).build());
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.PARALLEL_JOIN).name("Parallel Join").category("Control")
                .description("Wait for parallel branches").trigger(false)
                .configFields(List.of()).configSchema(List.of()).build());
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.CONDITIONAL_BRANCH).name("Conditional Branch").category("Control")
                .description("Route based on condition").trigger(false)
                .configFields(List.of("conditionField"))
                .configSchema(List.of(
                        field("conditionField", "Condition Field", "text", "Config", "branch", false, null, "status")
                )).build());

        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.FILE_READ).name("File Read").category("Source")
                .description("Read content from a file path").trigger(false)
                .configFields(List.of("path"))
                .configSchema(List.of(
                        field("path", "File Path", "text", "Config", "", true, null, "/data/file.csv")
                )).build());
        plugins.add(PluginMetadataDto.builder()
                .type(PluginType.SHELL_EXEC).name("Shell / Script").category("Task")
                .description("Run a shell command or simulate script output").trigger(false)
                .configFields(List.of("command", "simulate"))
                .configSchema(List.of(
                        field("command",  "Shell Command",   "text",   "Config", "",     false, null, "echo hello"),
                        field("simulate", "Simulation Mode", "select", "Config", "true", false, List.of("true","false"), "true")
                )).build());

        return plugins;
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private PluginFieldSchema field(String key, String label, String type, String group,
                                    String defaultValue, boolean required,
                                    List<String> options, String placeholder) {
        return PluginFieldSchema.builder()
                .key(key).label(label).type(type).group(group)
                .defaultValue(defaultValue).required(required)
                .options(options).placeholder(placeholder)
                .build();
    }
}
