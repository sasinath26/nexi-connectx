package com.nexi.connectx.workflow.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workflow_node", schema = "nexi_connectx",
        uniqueConstraints = @UniqueConstraint(columnNames = {"workflow_id", "node_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    @JsonIgnore
    private WorkflowDefinition workflow;

    @Column(name = "node_key", nullable = false)
    private String nodeKey;

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "plugin_type", nullable = false)
    private PluginType pluginType;

    @Column(columnDefinition = "TEXT")
    private String configJson;

    private Integer positionX;
    private Integer positionY;
}
