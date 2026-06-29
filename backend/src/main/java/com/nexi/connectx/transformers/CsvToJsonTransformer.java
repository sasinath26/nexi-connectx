package com.nexi.connectx.transformers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexi.connectx.model.dto.IntegrationPayload;
import com.opencsv.CSVReader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.StringReader;
import java.util.*;

@Component
@RequiredArgsConstructor
public class CsvToJsonTransformer {

    private final ObjectMapper objectMapper;

    public String transform(String csvContent) throws Exception {
        try (CSVReader reader = new CSVReader(new StringReader(csvContent))) {
            String[] headers = reader.readNext();
            if (headers == null) {
                throw new IllegalArgumentException("CSV file is empty");
            }
            List<IntegrationPayload> records = new ArrayList<>();
            String[] row;
            int index = 0;
            while ((row = reader.readNext()) != null) {
                Map<String, Object> attributes = new LinkedHashMap<>();
                for (int i = 0; i < headers.length && i < row.length; i++) {
                    attributes.put(headers[i].trim(), row[i]);
                }
                IntegrationPayload payload = IntegrationPayload.builder()
                        .id(String.valueOf(++index))
                        .name(getAttribute(attributes, "name"))
                        .email(getAttribute(attributes, "email"))
                        .type(getAttribute(attributes, "type"))
                        .source("CSV")
                        .attributes(attributes)
                        .build();
                records.add(payload);
            }
            return objectMapper.writeValueAsString(records);
        }
    }

    private String getAttribute(Map<String, Object> attributes, String key) {
        Object value = attributes.get(key);
        if (value == null) {
            value = attributes.get(key.toUpperCase());
        }
        return value != null ? value.toString() : null;
    }
}
