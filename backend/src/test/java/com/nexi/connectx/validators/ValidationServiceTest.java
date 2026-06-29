package com.nexi.connectx.validators;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ValidationServiceTest {

    private ValidationService validationService;

    @BeforeEach
    void setUp() {
        validationService = new ValidationService(new ObjectMapper());
    }

    @Test
    void shouldPassValidRecord() {
        String json = """
                [{"id":"1","name":"John","email":"john@example.com","type":"GENERAL","source":"CSV"}]
                """;
        assertDoesNotThrow(() -> validationService.validate(json));
    }

    @Test
    void shouldFailMissingMandatoryField() {
        String json = """
                [{"id":"1","type":"GENERAL","source":"CSV"}]
                """;
        ValidationException ex = assertThrows(ValidationException.class,
                () -> validationService.validate(json));
        assertTrue(ex.getMessage().contains("name"));
    }

    @Test
    void shouldFailVipWithoutEmail() {
        String json = """
                [{"id":"1","name":"VIP User","type":"VIP","source":"JSON"}]
                """;
        assertThrows(ValidationException.class, () -> validationService.validate(json));
    }
}
