package com.nexi.connectx.controller;

import com.nexi.connectx.dto.PlatformEnvironmentResponse;
import com.nexi.connectx.service.PlatformEnvironmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform")
@RequiredArgsConstructor
@Tag(name = "Platform", description = "Deployment and platform context")
public class PlatformEnvironmentController {

    private final PlatformEnvironmentService platformEnvironmentService;

    @GetMapping("/environment")
    @Operation(summary = "Get current deployment environment from Spring active profile")
    public ResponseEntity<PlatformEnvironmentResponse> getEnvironment() {
        return ResponseEntity.ok(platformEnvironmentService.getCurrentEnvironment());
    }
}
