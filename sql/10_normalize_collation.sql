-- ============================================================================
-- Banking Transaction Database System
-- Script 10: Normalize Collation
-- ============================================================================
-- Use this after importing into a managed MySQL database whose default
-- collation differs from the schema, for example Aiven defaultdb using
-- utf8mb4_0900_ai_ci. Stored procedure parameters inherit the database
-- collation, so the database, tables, and routines must agree.
-- ============================================================================

SET @current_database = DATABASE();
SET @alter_database_sql = CONCAT(
  'ALTER DATABASE `',
  REPLACE(@current_database, '`', '``'),
  '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
);

PREPARE alter_database_stmt FROM @alter_database_sql;
EXECUTE alter_database_stmt;
DEALLOCATE PREPARE alter_database_stmt;

ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE customers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE tellers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE accounts CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE transactions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE transfers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE failed_transaction_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SELECT
  'Collation normalized. Re-run sql/04_stored_procedures.sql so routine parameters inherit utf8mb4_unicode_ci.' AS status;
