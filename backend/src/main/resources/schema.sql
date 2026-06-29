CREATE SCHEMA IF NOT EXISTS nexi_connectx;

ALTER TABLE IF EXISTS nexi_connectx.workflow_node_execution ALTER COLUMN input_payload TYPE TEXT;
ALTER TABLE IF EXISTS nexi_connectx.workflow_node_execution ALTER COLUMN output_payload TYPE TEXT;
ALTER TABLE IF EXISTS nexi_connectx.workflow_node_execution ALTER COLUMN error_message  TYPE TEXT;

ALTER TABLE IF EXISTS nexi_connectx.workflow_execution ALTER COLUMN payload             TYPE TEXT;
ALTER TABLE IF EXISTS nexi_connectx.workflow_execution ALTER COLUMN transformed_payload TYPE TEXT;
ALTER TABLE IF EXISTS nexi_connectx.workflow_execution ALTER COLUMN error_message       TYPE TEXT;

-- Employees table for CSV upload workflow
CREATE TABLE IF NOT EXISTS nexi_connectx.employees (
    employee_id  BIGINT PRIMARY KEY,
    first_name   VARCHAR(100),
    last_name    VARCHAR(100),
    email        VARCHAR(150),
    department   VARCHAR(100),
    salary       NUMERIC(12,2)
);
