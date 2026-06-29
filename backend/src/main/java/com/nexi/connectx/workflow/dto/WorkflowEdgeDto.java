package com.nexi.connectx.workflow.dto;

import lombok.Data;

@Data
public class WorkflowEdgeDto {
    private String sourceNodeKey;
    private String targetNodeKey;
    private String conditionExpression;
    private Integer executionOrder;
}
