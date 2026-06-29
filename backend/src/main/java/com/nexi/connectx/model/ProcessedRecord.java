package com.nexi.connectx.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "processed_record", schema = "nexi_connectx")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessedRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String workflowId;
    private String recordType;
    private String externalId;
    private String payload;

    @Column(nullable = false)
    private Instant processedAt;

    @PrePersist
    public void prePersist() {
        if (processedAt == null) {
            processedAt = Instant.now();
        }
    }
}
