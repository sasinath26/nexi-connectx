package com.nexi.connectx.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "workflow_execution", schema = "nexi_connectx")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workflowId;

    @Column(nullable = false)
    private String routeId;

    @Column(nullable = false)
    private String sourceType;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ExecutionStatus status;

    private String sourceFile;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @Column(columnDefinition = "TEXT")
    private String transformedPayload;

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
