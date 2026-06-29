package com.nexi.connectx.workflow.engine;

import com.nexi.connectx.config.NexiConnectXProperties;
import com.nexi.connectx.workflow.model.PluginType;
import com.nexi.connectx.workflow.model.WorkflowDefinition;
import com.nexi.connectx.workflow.model.WorkflowNode;
import com.nexi.connectx.workflow.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.apache.camel.CamelContext;
import org.apache.camel.builder.RouteBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class DynamicWorkflowRouteService {

    private static final Logger log = LoggerFactory.getLogger(DynamicWorkflowRouteService.class);
    public static final String HEADER_WORKFLOW_DEFINITION_ID = "NexiWorkflowDefinitionId";

    private final CamelContext camelContext;
    private final NexiConnectXProperties properties;
    private final WorkflowDefinitionRepository workflowDefinitionRepository;

    private final Map<Long, String> deployedRouteIds = new ConcurrentHashMap<>();

    public void deploy(WorkflowDefinition definition) throws Exception {
        undeploy(definition.getId());

        WorkflowNode trigger = definition.getNodes().stream()
                .filter(n -> n.getNodeKey().equals(definition.getTriggerNodeKey()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Trigger node not found"));

        String triggerUri = buildTriggerUri(trigger, definition);
        String routeId = "dynamic-wf-" + definition.getId();

        String manualUri = "direct:workflow-trigger-" + definition.getId();
        RouteBuilder routeBuilder = new RouteBuilder() {
            @Override
            public void configure() {
                from(triggerUri)
                        .routeId(routeId)
                        .setHeader(HEADER_WORKFLOW_DEFINITION_ID, constant(definition.getId()))
                        .to(WorkflowEngineConstants.ENGINE_URI);

                from(manualUri)
                        .routeId(routeId + "-manual")
                        .setHeader(HEADER_WORKFLOW_DEFINITION_ID, constant(definition.getId()))
                        .to(WorkflowEngineConstants.ENGINE_URI);
            }
        };

        camelContext.addRoutes(routeBuilder);
        camelContext.getRouteController().startRoute(routeId);
        deployedRouteIds.put(definition.getId(), routeId);
        log.info("Deployed dynamic workflow route {} from {}", routeId, triggerUri);
    }

    public void undeploy(Long workflowDefinitionId) throws Exception {
        String routeId = deployedRouteIds.remove(workflowDefinitionId);
        if (routeId != null) {
            stopAndRemove(routeId);
            stopAndRemove(routeId + "-manual");
            log.info("Undeployed dynamic workflow routes for {}", workflowDefinitionId);
        }
    }

    private void stopAndRemove(String routeId) throws Exception {
        if (camelContext.getRoute(routeId) != null) {
            camelContext.getRouteController().stopRoute(routeId);
            camelContext.removeRoute(routeId);
        }
    }

    public void deployById(Long workflowDefinitionId) throws Exception {
        WorkflowDefinition definition = workflowDefinitionRepository.findById(workflowDefinitionId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found"));
        deploy(definition);
    }

    private String buildTriggerUri(WorkflowNode trigger, WorkflowDefinition definition) {
        Map<String, Object> config = parseConfig(trigger.getConfigJson());
        return switch (trigger.getPluginType()) {
            case FILE_UPLOAD -> {
                String dir = config.getOrDefault("inputDir", properties.getFile().getInputDir()).toString();
                yield "file:" + dir + "?includeExt=csv,xml,json&noop=true&idempotent=false";
            }
            case KAFKA_CONSUMER -> {
                String topic = config.getOrDefault("topic", properties.getKafka().getConsumerTopic()).toString();
                yield "kafka:" + topic + "?brokers=" + properties.getKafka().getBootstrapServers()
                        + "&groupId=" + properties.getKafka().getGroupId() + "-wf-" + definition.getId();
            }
            default -> "direct:workflow-trigger-" + definition.getId();
        };
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseConfig(String json) {
        try {
            if (json == null || json.isBlank()) return Map.of();
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }
}
