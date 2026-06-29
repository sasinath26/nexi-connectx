package com.nexi.connectx.workflow.repository;

import com.nexi.connectx.workflow.model.WorkflowNodeExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowNodeExecutionRepository extends JpaRepository<WorkflowNodeExecution, Long> {

    List<WorkflowNodeExecution> findByExecutionIdOrderByStartedAtAsc(String executionId);

    List<WorkflowNodeExecution> findByWorkflowDefinitionIdOrderByStartedAtDesc(Long workflowDefinitionId);
}
