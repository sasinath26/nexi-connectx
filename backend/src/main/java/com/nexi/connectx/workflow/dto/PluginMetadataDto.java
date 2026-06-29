package com.nexi.connectx.workflow.dto;

import com.nexi.connectx.workflow.model.PluginType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PluginMetadataDto {
    private PluginType type;
    private String name;
    private String category;
    private String description;
    private boolean trigger;
    private List<String> configFields;
    /** Rich schema consumed by the frontend Properties Panel to render typed, grouped form fields */
    private List<PluginFieldSchema> configSchema;
}
