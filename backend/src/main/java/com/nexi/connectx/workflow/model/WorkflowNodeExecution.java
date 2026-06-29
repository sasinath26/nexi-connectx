package com.nexi.connectx.workflow.model;

import com.nexi.connectx.model.ExecutionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "workflow_node_execution", schema = "nexi_connectx")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowNodeExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String executionId;

    @Column(nullable = false)
    private Long workflowDefinitionId;

    @Column(nullable = false)
    private String nodeKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExecutionStatus status;

    @Column(columnDefinition = "TEXT")
    private String inputPayload;

    @Column(columnDefinition = "TEXT")
    private String outputPayload;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    private Integer retryCount;
    private Long processingTimeMs;

    @Column(nullable = false)
    private Instant startedAt;

    private Instant completedAt;

    @PrePersist
    public void prePersist() {
        if (startedAt == null) {
            startedAt = Instant.now();
        }
        if (retryCount == null) {
            retryCount = 0;
        }
    }
}
