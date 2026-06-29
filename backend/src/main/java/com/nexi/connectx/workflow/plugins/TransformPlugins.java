package com.nexi.connectx.workflow.plugins;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nexi.connectx.transformers.DataEnrichmentProcessor;
import com.nexi.connectx.transformers.TransformationService;
import com.nexi.connectx.validators.ValidationService;
import com.nexi.connectx.workflow.engine.WorkflowExecutionContext;
import com.nexi.connectx.workflow.engine.WorkflowPluginExecutor;
import com.nexi.connectx.workflow.model.PluginType;
import com.nexi.connectx.workflow.model.WorkflowNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.StringReader;
import java.util.*;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
class CsvTransformPlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private final ObjectMapper objectMapper;

    @Override
    public PluginType getPluginType() {
        return PluginType.CSV_TRANSFORM;
    }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        Map<String, Object> cfg = context.getNodeConfig(node);

        String delimiter       = cfg.getOrDefault("delimiter", ",").toString();
        boolean hasHeader      = !"false".equalsIgnoreCase(cfg.getOrDefault("hasHeader", "true").toString());
        boolean trimValues     = !"false".equalsIgnoreCase(cfg.getOrDefault("trimValues", "true").toString());
        boolean ignoreEmpty    = !"false".equalsIgnoreCase(cfg.getOrDefault("ignoreEmptyRows", "true").toString());
        boolean removeSpecial  = "true".equalsIgnoreCase(cfg.getOrDefault("removeSpecialChars", "false").toString());
        String  outputStruct   = cfg.getOrDefault("jsonOutputStructure", "FLAT").toString();

        // fieldMapping stored as JSON object string: {"csvCol":"jsonKey",...}
        Map<String, String> fieldMapping = parseMapConfig(cfg.get("fieldMapping"));
        Set<String> intFields  = parseSetConfig(cfg.get("integerFields"));
        Set<String> boolFields = parseSetConfig(cfg.get("booleanFields"));

        context.setFormat("CSV");

        String csv = context.getPayload();
        if (csv == null || csv.isBlank()) {
            context.setPayload("[]");
            return;
        }

        String[] lines = csv.split("\\r?\\n");
        if (lines.length == 0) {
            context.setPayload("[]");
            return;
        }

        String sep = Pattern.quote(delimiter);
        String[] headers = hasHeader ? splitLine(lines[0], sep, trimValues) : buildDefaultHeaders(lines, sep);

        ArrayNode result = objectMapper.createArrayNode();
        int startLine = hasHeader ? 1 : 0;

        for (int i = startLine; i < lines.length; i++) {
            String line = lines[i];
            if (ignoreEmpty && line.isBlank()) continue;

            String[] values = splitLine(line, sep, trimValues);
            ObjectNode record = objectMapper.createObjectNode();

            for (int j = 0; j < headers.length; j++) {
                String header = headers[j];
                String jsonKey = fieldMapping.getOrDefault(header, header);
                String raw     = j < values.length ? values[j] : "";
                if (removeSpecial) raw = raw.replaceAll("[^\\p{Print}]", "");

                if (intFields.contains(header) || intFields.contains(jsonKey)) {
                    try { record.put(jsonKey, Long.parseLong(raw)); } catch (NumberFormatException e) { record.put(jsonKey, raw); }
                } else if (boolFields.contains(header) || boolFields.contains(jsonKey)) {
                    record.put(jsonKey, "true".equalsIgnoreCase(raw) || "1".equals(raw) || "yes".equalsIgnoreCase(raw));
                } else {
                    record.put(jsonKey, raw);
                }
            }
            result.add(record);
        }

        context.setPayload(objectMapper.writeValueAsString(result));
    }

    // ── helpers ─────────────────────────────────────────────────────────

    private String[] splitLine(String line, String sep, boolean trim) {
        String[] parts = line.split(sep, -1);
        if (trim) for (int i = 0; i < parts.length; i++) parts[i] = parts[i].trim();
        return parts;
    }

    private String[] buildDefaultHeaders(String[] lines, String sep) {
        int maxCols = 0;
        for (String l : lines) if (!l.isBlank()) maxCols = Math.max(maxCols, l.split(sep, -1).length);
        String[] h = new String[maxCols];
        for (int i = 0; i < maxCols; i++) h[i] = "col" + (i + 1);
        return h;
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseMapConfig(Object raw) {
        if (raw == null) return Map.of();
        try {
            if (raw instanceof Map) return (Map<String, String>) raw;
            String s = raw.toString().trim();
            if (s.startsWith("{")) return objectMapper.readValue(s, new TypeReference<>() {});
            // support "a→b, c→d" notation
            Map<String, String> m = new LinkedHashMap<>();
            for (String pair : s.split(",")) {
                String[] kv = pair.split("[→>]", 2);
                if (kv.length == 2) m.put(kv[0].trim(), kv[1].trim());
            }
            return m;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Set<String> parseSetConfig(Object raw) {
        if (raw == null) return Set.of();
        Set<String> s = new LinkedHashSet<>();
        for (String part : raw.toString().split("[,;\\s]+")) {
            String t = part.trim();
            if (!t.isEmpty()) s.add(t);
        }
        return s;
    }
}

// ────────────────────────────────────────────────────────────────────────────

@Component
@RequiredArgsConstructor
class XmlTransformPlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private final TransformationService transformationService;

    @Override
    public PluginType getPluginType() { return PluginType.XML_TRANSFORM; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        context.setFormat("XML");
        String result = transformationService.transform(context.getPayload(), "XML");
        context.setPayload(result);
    }
}

// ────────────────────────────────────────────────────────────────────────────

@Component
@RequiredArgsConstructor
class JsonTransformPlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private final TransformationService transformationService;

    @Override
    public PluginType getPluginType() { return PluginType.JSON_TRANSFORM; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        context.setFormat("JSON");
        String result = transformationService.transform(context.getPayload(), "JSON");
        context.setPayload(result);
    }
}

// ────────────────────────────────────────────────────────────────────────────

/**
 * Config-driven validation plugin.
 * Reads mandatoryFields, emailFields, numericFields, regexRules, minLength, maxLength,
 * allowedValues from node configJson.
 * Falls back to original ValidationService behaviour when no config is provided.
 */
@Component
@RequiredArgsConstructor
class JsonValidatePlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final ValidationService validationService;
    private final ObjectMapper objectMapper;

    @Override
    public PluginType getPluginType() { return PluginType.JSON_VALIDATE; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        Map<String, Object> cfg = context.getNodeConfig(node);

        if (cfg.isEmpty()) {
            // fall back to static rules
            validationService.validate(context.getPayload());
            return;
        }

        Set<String> mandatoryFields = parseSet(cfg.get("mandatoryFields"));
        Set<String> emailFields     = parseSet(cfg.get("emailFields"));
        Set<String> numericFields   = parseSet(cfg.get("numericFields"));
        Map<String, String> regexRules    = parseMap(cfg.get("regexRules"));
        Map<String, Integer> minLengthMap = parseIntMap(cfg.get("minLength"));
        Map<String, Integer> maxLengthMap = parseIntMap(cfg.get("maxLength"));
        Map<String, Set<String>> allowedMap = parseAllowedValues(cfg.get("allowedValues"));
        boolean rejectInvalid     = !"false".equalsIgnoreCase(cfg.getOrDefault("rejectInvalid", "true").toString());
        boolean storeFailedRecs   = "true".equalsIgnoreCase(cfg.getOrDefault("storeFailedRecords", "false").toString());

        JsonNode root = objectMapper.readTree(context.getPayload());
        List<String> errors = new ArrayList<>();
        List<JsonNode> valid = new ArrayList<>();

        Iterable<JsonNode> records = root.isArray() ? root : List.of(root);
        int idx = 0;
        for (JsonNode rec : records) {
            List<String> recErrors = validateRecord(rec, "record[" + idx + "]",
                    mandatoryFields, emailFields, numericFields,
                    regexRules, minLengthMap, maxLengthMap, allowedMap);
            if (recErrors.isEmpty()) {
                valid.add(rec);
            } else {
                errors.addAll(recErrors);
            }
            idx++;
        }

        if (!errors.isEmpty() && rejectInvalid && valid.isEmpty()) {
            throw new RuntimeException("Validation failed: " + String.join("; ", errors));
        }

        // continue pipeline with only valid records
        if (root.isArray()) {
            context.setPayload(objectMapper.writeValueAsString(valid));
        }
        if (!errors.isEmpty()) {
            context.setVariable("validationErrors", errors);
        }
    }

    private List<String> validateRecord(JsonNode rec, String prefix,
                                        Set<String> mandatory, Set<String> emailFields,
                                        Set<String> numericFields, Map<String, String> regexRules,
                                        Map<String, Integer> minLen, Map<String, Integer> maxLen,
                                        Map<String, Set<String>> allowed) {
        List<String> errs = new ArrayList<>();

        for (String f : mandatory) {
            if (!rec.has(f) || rec.get(f).isNull() || rec.get(f).asText().isBlank()) {
                errs.add(prefix + ": mandatory field '" + f + "' is missing");
            }
        }
        for (String f : emailFields) {
            if (rec.has(f) && !rec.get(f).asText().isBlank()) {
                if (!EMAIL_PATTERN.matcher(rec.get(f).asText()).matches())
                    errs.add(prefix + ": invalid email in '" + f + "'");
            }
        }
        for (String f : numericFields) {
            if (rec.has(f) && !rec.get(f).asText().isBlank()) {
                try { Double.parseDouble(rec.get(f).asText()); }
                catch (NumberFormatException e) { errs.add(prefix + ": '" + f + "' must be numeric"); }
            }
        }
        regexRules.forEach((f, pattern) -> {
            if (rec.has(f)) {
                String val = rec.get(f).asText();
                if (!val.matches(pattern))
                    errs.add(prefix + ": '" + f + "' does not match pattern " + pattern);
            }
        });
        minLen.forEach((f, len) -> {
            if (rec.has(f) && rec.get(f).asText().length() < len)
                errs.add(prefix + ": '" + f + "' must be at least " + len + " chars");
        });
        maxLen.forEach((f, len) -> {
            if (rec.has(f) && rec.get(f).asText().length() > len)
                errs.add(prefix + ": '" + f + "' must be at most " + len + " chars");
        });
        allowed.forEach((f, vals) -> {
            if (rec.has(f) && !vals.contains(rec.get(f).asText()))
                errs.add(prefix + ": '" + f + "' value not in allowed set " + vals);
        });
        return errs;
    }

    // ── helpers ─────────────────────────────────────────────────────────

    private Set<String> parseSet(Object raw) {
        if (raw == null) return Set.of();
        Set<String> s = new LinkedHashSet<>();
        for (String p : raw.toString().split("[,;]")) { String t = p.trim(); if (!t.isEmpty()) s.add(t); }
        return s;
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseMap(Object raw) {
        if (raw == null) return Map.of();
        try {
            if (raw instanceof Map) return (Map<String, String>) raw;
            String s = raw.toString().trim();
            if (s.startsWith("{")) return objectMapper.readValue(s, new TypeReference<>() {});
            Map<String, String> m = new LinkedHashMap<>();
            for (String pair : s.split(",")) {
                String[] kv = pair.split("[→>]", 2);
                if (kv.length == 2) m.put(kv[0].trim(), kv[1].trim());
            }
            return m;
        } catch (Exception e) { return Map.of(); }
    }

    private Map<String, Integer> parseIntMap(Object raw) {
        if (raw == null) return Map.of();
        Map<String, Integer> m = new LinkedHashMap<>();
        parseMap(raw).forEach((k, v) -> {
            try { m.put(k, Integer.parseInt(v)); } catch (NumberFormatException ignored) {}
        });
        return m;
    }

    private Map<String, Set<String>> parseAllowedValues(Object raw) {
        if (raw == null) return Map.of();
        Map<String, Set<String>> m = new LinkedHashMap<>();
        parseMap(raw).forEach((k, v) -> {
            Set<String> vals = new LinkedHashSet<>();
            for (String s : v.split(",")) vals.add(s.trim());
            m.put(k, vals);
        });
        return m;
    }
}

// ────────────────────────────────────────────────────────────────────────────

@Component
@RequiredArgsConstructor
class DataEnrichPlugin extends AbstractWorkflowPlugin implements WorkflowPluginExecutor {

    private final DataEnrichmentProcessor dataEnrichmentProcessor;

    @Override
    public PluginType getPluginType() { return PluginType.DATA_ENRICH; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        String region = configString(context, node, "region", "US-EAST");
        context.setVariable("region", region);
        String enriched = dataEnrichmentProcessor.enrich(context.getPayload());
        context.setPayload(enriched);
    }
}
