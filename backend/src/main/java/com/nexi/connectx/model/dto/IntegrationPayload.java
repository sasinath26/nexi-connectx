package com.nexi.connectx.model.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class IntegrationPayload {

    private String id;
    private String name;
    private String email;
    private String type;
    private String source;
    private Map<String, Object> attributes;
    private String enrichedBy;
}
