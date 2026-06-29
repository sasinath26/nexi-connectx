package com.nexi.connectx.monitoring;

import lombok.RequiredArgsConstructor;
import org.apache.camel.CamelContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HealthCheckService {

    private final CamelContext camelContext;
    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> getHealthStatus() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("camel", Map.of(
                "status", camelContext.getStatus().name(),
                "routes", camelContext.getRoutes().size()
        ));
        health.put("database", checkDatabase());
        health.put("timestamp", java.time.Instant.now().toString());
        return health;
    }

    private Map<String, String> checkDatabase() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return Map.of("status", "UP");
        } catch (Exception e) {
            return Map.of("status", "DOWN", "error", e.getMessage());
        }
    }
}
