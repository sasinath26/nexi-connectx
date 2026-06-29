package com.nexi.connectx.transformers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JsonMappingTransformer {

    private final ObjectMapper objectMapper;

    public String normalize(String jsonContent) throws Exception {
        JsonNode root = objectMapper.readTree(jsonContent);
        if (root.isArray()) {
            ArrayNode normalized = objectMapper.createArrayNode();
            for (JsonNode item : root) {
                normalized.add(mapRecord(item));
            }
            return objectMapper.writeValueAsString(normalized);
        }
        return objectMapper.writeValueAsString(mapRecord(root));
    }

    private ObjectNode mapRecord(JsonNode node) {
        ObjectNode mapped = objectMapper.createObjectNode();
        mapped.put("id", textOrDefault(node, "id", "unknown"));
        mapped.put("name", textOrDefault(node, "name", "unknown"));
        mapped.put("email", textOrDefault(node, "email", ""));
        mapped.put("type", textOrDefault(node, "type", "GENERAL"));
        mapped.put("source", textOrDefault(node, "source", "JSON"));
        mapped.set("attributes", node.has("attributes") ? node.get("attributes") : node);
        return mapped;
    }

    private String textOrDefault(JsonNode node, String field, String defaultValue) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : defaultValue;
    }
}
