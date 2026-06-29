package com.nexi.connectx.workflow.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workflow_edge", schema = "nexi_connectx")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowEdge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    @JsonIgnore
    private WorkflowDefinition workflow;

    @Column(name = "source_node_key", nullable = false)
    private String sourceNodeKey;

    @Column(name = "target_node_key", nullable = false)
    private String targetNodeKey;

    /** Optional condition expression, e.g. format==CSV or branch==true */
    private String conditionExpression;

    private Integer executionOrder;
}
