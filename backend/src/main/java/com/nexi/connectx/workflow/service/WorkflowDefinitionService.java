package com.nexi.connectx.workflow.service;

import com.nexi.connectx.workflow.dto.WorkflowDefinitionRequest;
import com.nexi.connectx.workflow.dto.WorkflowEdgeDto;
import com.nexi.connectx.workflow.dto.WorkflowNodeDto;
import com.nexi.connectx.workflow.engine.DynamicWorkflowRouteService;
import com.nexi.connectx.workflow.engine.WorkflowOrchestrationService;
import com.nexi.connectx.workflow.model.*;
import com.nexi.connectx.workflow.repository.WorkflowDefinitionRepository;
import com.nexi.connectx.workflow.repository.WorkflowNodeExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.apache.camel.ProducerTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkflowDefinitionService {

    private final WorkflowDefinitionRepository repository;
    private final WorkflowNodeExecutionRepository nodeExecutionRepository;
    private final DynamicWorkflowRouteService routeService;
    private final WorkflowOrchestrationService orchestrationService;
    private final ProducerTemplate producerTemplate;

    public List<WorkflowDefinition> findAll() {
        return repository.findAll();
    }

    public WorkflowDefinition findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + id));
    }

    @Transactional(readOnly = true)
    public WorkflowDefinition findByIdWithGraph(Long id) {
        WorkflowDefinition def = findById(id);
        def.getNodes().size();
        def.getEdges().size();
        return def;
    }

    @Transactional
    public WorkflowDefinition create(WorkflowDefinitionRequest request) {
        if (repository.findByCode(request.getCode()).isPresent()) {
            throw new IllegalArgumentException("Workflow code already exists: " + request.getCode());
        }
        WorkflowDefinition definition = mapToEntity(new WorkflowDefinition(), request);
        definition.setVersion(1);
        return repository.save(definition);
    }

    @Transactional
    public WorkflowDefinition update(Long id, WorkflowDefinitionRequest request) {
        WorkflowDefinition definition = findById(id);
        try {
            routeService.undeploy(id);
        } catch (Exception ignored) {
            // route may not exist
        }
        definition.getNodes().clear();
        definition.getEdges().clear();
        repository.flush();
        mapToEntity(definition, request);
        definition.setVersion(definition.getVersion() + 1);
        WorkflowDefinition saved = repository.save(definition);
        if (saved.getStatus() == WorkflowDefinitionStatus.ACTIVE) {
            deploy(saved.getId());
        }
        return saved;
    }

    @Transactional
    public void delete(Long id) throws Exception {
        routeService.undeploy(id);
        repository.deleteById(id);
    }

    @Transactional
    public WorkflowDefinition activate(Long id) {
        WorkflowDefinition def = findByIdWithGraph(id);
        def.setStatus(WorkflowDefinitionStatus.ACTIVE);
        WorkflowDefinition saved = repository.save(def);
        deploy(id);
        return saved;
    }

    @Transactional
    public WorkflowDefinition deactivate(Long id) throws Exception {
        WorkflowDefinition def = findById(id);
        def.setStatus(WorkflowDefinitionStatus.INACTIVE);
        routeService.undeploy(id);
        return repository.save(def);
    }

    @Transactional(readOnly = true)
    public void deploy(Long id) {
        try {
            WorkflowDefinition def = findByIdWithGraph(id);
            routeService.deploy(def);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deploy workflow route: " + e.getMessage(), e);
        }
    }

    public com.nexi.connectx.workflow.engine.WorkflowExecutionContext execute(Long id, String payload) throws Exception {
        return orchestrationService.execute(id, payload != null ? payload : "[]");
    }

    public void triggerViaCamel(Long id, String payload) {
        producerTemplate.sendBodyAndHeader(
                "direct:workflow-trigger-" + id,
                payload != null ? payload : "[]",
                DynamicWorkflowRouteService.HEADER_WORKFLOW_DEFINITION_ID,
                id);
    }

    public List<WorkflowNodeExecution> getNodeExecutions(String executionId) {
        return nodeExecutionRepository.findByExecutionIdOrderByStartedAtAsc(executionId);
    }

    private WorkflowDefinition mapToEntity(WorkflowDefinition definition, WorkflowDefinitionRequest request) {
        definition.setCode(request.getCode());
        definition.setName(request.getName());
        definition.setDescription(request.getDescription());
        definition.setStatus(request.getStatus() != null ? request.getStatus() : WorkflowDefinitionStatus.DRAFT);
        definition.setTriggerNodeKey(request.getTriggerNodeKey());

        if (request.getNodes() != null) {
            for (WorkflowNodeDto dto : request.getNodes()) {
                WorkflowNode node = WorkflowNode.builder()
                        .workflow(definition)
                        .nodeKey(dto.getNodeKey())
                        .label(dto.getLabel())
                        .pluginType(dto.getPluginType())
                        .configJson(dto.getConfigJson())
                        .positionX(dto.getPositionX())
                        .positionY(dto.getPositionY())
                        .build();
                definition.getNodes().add(node);
            }
        }

        if (request.getEdges() != null) {
            for (WorkflowEdgeDto dto : request.getEdges()) {
                WorkflowEdge edge = WorkflowEdge.builder()
                        .workflow(definition)
                        .sourceNodeKey(dto.getSourceNodeKey())
                        .targetNodeKey(dto.getTargetNodeKey())
                        .conditionExpression(dto.getConditionExpression())
                        .executionOrder(dto.getExecutionOrder())
                        .build();
                definition.getEdges().add(edge);
            }
        }
        return definition;
    }
}
