package com.nexi.connectx.repository;

import com.nexi.connectx.model.ExecutionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExecutionLogRepository extends JpaRepository<ExecutionLog, Long> {

    List<ExecutionLog> findTop100ByOrderByTimestampDesc();

    List<ExecutionLog> findTop50ByWorkflowIdOrderByTimestampDesc(String workflowId);
}
