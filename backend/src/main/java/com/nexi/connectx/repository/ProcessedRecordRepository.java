package com.nexi.connectx.repository;

import com.nexi.connectx.model.ProcessedRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedRecordRepository extends JpaRepository<ProcessedRecord, Long> {
}
