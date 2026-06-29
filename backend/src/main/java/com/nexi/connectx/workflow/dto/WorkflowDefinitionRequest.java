package com.nexi.connectx.workflow.dto;

import com.nexi.connectx.workflow.model.WorkflowDefinitionStatus;
import lombok.Data;

import java.util.List;

@Data
public class WorkflowDefinitionRequest {
    private String code;
    private String name;
    private String description;
    private WorkflowDefinitionStatus status;
    private String triggerNodeKey;
    private List<WorkflowNodeDto> nodes;
    private List<WorkflowEdgeDto> edges;
}
