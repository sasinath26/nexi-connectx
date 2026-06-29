package com.nexi.connectx.controller;

import com.nexi.connectx.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Monitoring dashboard APIs")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @Operation(summary = "Get dashboard summary")
    public ResponseEntity<?> getDashboard() {
        return ResponseEntity.ok(dashboardService.getDashboard());
    }

    @GetMapping("/routes")
    @Operation(summary = "Get Camel route statuses")
    public ResponseEntity<?> getRoutes() {
        return ResponseEntity.ok(dashboardService.getRouteStatuses());
    }

    @GetMapping("/health")
    @Operation(summary = "Get application health")
    public ResponseEntity<?> getHealth() {
        return ResponseEntity.ok(dashboardService.getDashboard().get("health"));
    }
}
