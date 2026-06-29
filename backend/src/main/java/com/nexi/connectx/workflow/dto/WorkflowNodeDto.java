package com.nexi.connectx.workflow.dto;

import com.nexi.connectx.workflow.model.PluginType;
import lombok.Data;

@Data
public class WorkflowNodeDto {
    private String nodeKey;
    private String label;
    private PluginType pluginType;
    private String configJson;
    private Integer positionX;
    private Integer positionY;
}
