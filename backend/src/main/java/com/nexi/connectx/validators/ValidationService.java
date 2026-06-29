package com.nexi.connectx.validators;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ValidationService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final ObjectMapper objectMapper;

    public void validate(String jsonContent) throws Exception {
        JsonNode root = objectMapper.readTree(jsonContent);
        List<String> errors = new ArrayList<>();

        if (root.isArray()) {
            int index = 0;
            for (JsonNode node : root) {
                validateRecord(node, errors, "record[" + index++ + "]");
            }
        } else {
            validateRecord(root, errors, "record");
        }

        if (!errors.isEmpty()) {
            throw new ValidationException(String.join("; ", errors));
        }
    }

    private void validateRecord(JsonNode node, List<String> errors, String prefix) {
        validateMandatory(node, "name", prefix, errors);
        validateMandatory(node, "type", prefix, errors);
        validateBusinessRules(node, prefix, errors);
        validateSchema(node, prefix, errors);
    }

    private void validateMandatory(JsonNode node, String field, String prefix, List<String> errors) {
        if (!node.has(field) || node.get(field).isNull() || node.get(field).asText().isBlank()) {
            errors.add(prefix + ": mandatory field '" + field + "' is missing");
        }
    }

    private void validateBusinessRules(JsonNode node, String prefix, List<String> errors) {
        if (node.has("type")) {
            String type = node.get("type").asText();
            if ("VIP".equalsIgnoreCase(type) && (!node.has("email") || node.get("email").asText().isBlank())) {
                errors.add(prefix + ": VIP records require a valid email");
            }
        }
        if (node.has("email") && !node.get("email").asText().isBlank()) {
            String email = node.get("email").asText();
            if (!EMAIL_PATTERN.matcher(email).matches()) {
                errors.add(prefix + ": invalid email format");
            }
        }
    }

    private void validateSchema(JsonNode node, String prefix, List<String> errors) {
        if (!node.has("source")) {
            errors.add(prefix + ": schema violation - 'source' is required");
        }
    }
}
