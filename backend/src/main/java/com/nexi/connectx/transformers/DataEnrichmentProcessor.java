package com.nexi.connectx.transformers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class DataEnrichmentProcessor {

    private final ObjectMapper objectMapper;

    public String enrich(String jsonContent) throws Exception {
        JsonNode root = objectMapper.readTree(jsonContent);
        if (root.isArray()) {
            ArrayNode enriched = objectMapper.createArrayNode();
            for (JsonNode item : root) {
                enriched.add(enrichRecord(item));
            }
            return objectMapper.writeValueAsString(enriched);
        }
        return objectMapper.writeValueAsString(enrichRecord(root));
    }

    private ObjectNode enrichRecord(JsonNode node) {
        ObjectNode enriched = node.deepCopy();
        enriched.put("enrichedBy", "NexiConnectX");
        enriched.put("enrichedAt", Instant.now().toString());
        enriched.put("processingRegion", "US-EAST");
        return enriched;
    }
}
