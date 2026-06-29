package com.nexi.connectx.workflow.repository;

import com.nexi.connectx.workflow.model.WorkflowDefinition;
import com.nexi.connectx.workflow.model.WorkflowDefinitionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowDefinitionRepository extends JpaRepository<WorkflowDefinition, Long> {

    Optional<WorkflowDefinition> findByCode(String code);

    List<WorkflowDefinition> findByStatus(WorkflowDefinitionStatus status);
}
