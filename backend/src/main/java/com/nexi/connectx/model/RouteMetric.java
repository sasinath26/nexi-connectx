package com.nexi.connectx.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "route_metric", schema = "nexi_connectx")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String routeId;

    private long successCount;
    private long failureCount;
    private long totalExecutions;
    private double avgProcessingTimeMs;

    @Column(nullable = false)
    private Instant lastUpdatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        lastUpdatedAt = Instant.now();
    }
}
