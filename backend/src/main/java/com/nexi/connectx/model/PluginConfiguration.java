package com.nexi.connectx.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "plugin_configuration", schema = "nexi_connectx")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PluginConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String configKey;

    @Column(nullable = false)
    private String configValue;

    private String category;
    private String description;

    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = Instant.now();
    }
}
