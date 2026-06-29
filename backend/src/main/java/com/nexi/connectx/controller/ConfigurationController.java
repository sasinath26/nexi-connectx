package com.nexi.connectx.controller;

import com.nexi.connectx.service.PluginConfigurationService;
import com.nexi.connectx.service.RouteControlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
@Tag(name = "Configuration", description = "Plugin and route configuration APIs")
public class ConfigurationController {

    private final PluginConfigurationService pluginConfigurationService;
    private final RouteControlService routeControlService;

    @GetMapping
    @Operation(summary = "Get all plugin configurations")
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(pluginConfigurationService.findAll());
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update plugin configuration")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(pluginConfigurationService.update(id, body.get("configValue")));
    }

    @PostMapping("/routes/{routeId}/start")
    @Operation(summary = "Start a Camel route")
    public ResponseEntity<?> startRoute(@PathVariable String routeId) throws Exception {
        routeControlService.startRoute(routeId);
        return ResponseEntity.ok(Map.of("routeId", routeId, "status", "STARTED"));
    }

    @PostMapping("/routes/{routeId}/stop")
    @Operation(summary = "Stop a Camel route")
    public ResponseEntity<?> stopRoute(@PathVariable String routeId) throws Exception {
        routeControlService.stopRoute(routeId);
        return ResponseEntity.ok(Map.of("routeId", routeId, "status", "STOPPED"));
    }

    @GetMapping("/routes/{routeId}/status")
    @Operation(summary = "Get Camel route status")
    public ResponseEntity<?> routeStatus(@PathVariable String routeId) {
        return ResponseEntity.ok(Map.of(
                "routeId", routeId,
                "status", routeControlService.getRouteStatus(routeId)
        ));
    }
}
