package com.nexi.connectx.workflow.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Describes a single configuration field for a workflow plugin.
 * Used by the frontend to dynamically render the Properties Panel form.
 */
@Data
@Builder
public class PluginFieldSchema {
    /** JSON key used in configJson */
    private String key;
    /** Human-readable label */
    private String label;
    /**
     * UI input type:
     * text | password | number | select | checkbox | textarea | keyvalue
     * keyvalue = key-value pair map editor (e.g. column mappings)
     */
    private String type;
    /** Section / group name for rendering grouped fieldsets */
    private String group;
    /** Default value (as string) */
    private String defaultValue;
    /** Whether the field is mandatory before saving */
    private boolean required;
    /** Options list for type=select */
    private List<String> options;
    /** Placeholder hint shown in the input */
    private String placeholder;
}

