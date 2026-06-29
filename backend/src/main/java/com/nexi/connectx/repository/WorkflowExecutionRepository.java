package com.nexi.connectx.repository;

import com.nexi.connectx.model.ExecutionStatus;
import com.nexi.connectx.model.WorkflowExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, Long> {

    List<WorkflowExecution> findTop50ByOrderByStartedAtDesc();

    long countByStatus(ExecutionStatus status);

    List<WorkflowExecution> findByStatus(ExecutionStatus status);
}
