package com.nexi.connectx.service;

import com.nexi.connectx.dto.PlatformEnvironmentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PlatformEnvironmentService {

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    public PlatformEnvironmentResponse getCurrentEnvironment() {
        String profile = normalizeProfile(activeProfile);
        String environment = mapProfileToEnvironment(profile);
        boolean production = isProductionProfile(profile);

        return PlatformEnvironmentResponse.builder()
                .environment(environment)
                .profile(profile)
                .production(production)
                .readonly(false)
                .build();
    }

    private String normalizeProfile(String raw) {
        if (raw == null || raw.isBlank()) {
            return "default";
        }
        return raw.split(",")[0].trim().toLowerCase();
    }

    private String mapProfileToEnvironment(String profile) {
        return switch (profile) {
            case "dev", "development", "local" -> "DEV";
            case "qa", "test" -> "QA";
            case "stage", "staging", "uat" -> "STAGE";
            case "prod", "production" -> "PROD";
            default -> profile.toUpperCase();
        };
    }

    private boolean isProductionProfile(String profile) {
        return "prod".equals(profile) || "production".equals(profile);
    }
}
