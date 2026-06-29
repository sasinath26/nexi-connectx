package com.nexi.connectx.transformers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CsvToJsonTransformerTest {

    private CsvToJsonTransformer transformer;

    @BeforeEach
    void setUp() {
        transformer = new CsvToJsonTransformer(new ObjectMapper());
    }

    @Test
    void shouldTransformCsvToJson() throws Exception {
        String csv = """
                name,email,type
                Alice,alice@example.com,GENERAL
                Bob,bob@example.com,VIP
                """;
        String json = transformer.transform(csv);
        assertTrue(json.contains("Alice"));
        assertTrue(json.contains("alice@example.com"));
    }
}
