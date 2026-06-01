-- ============================================================================
-- Banking Transaction Database System
-- Script 03: Indexes
-- ============================================================================
-- Performance indexes beyond the automatic PK and UNIQUE indexes.
-- These speed up the most common query patterns:
--   - Looking up customers by user_id (authentication flow)
--   - Looking up accounts by customer_id (dashboard, account list)
--   - Filtering transactions by account, type, status, and date
--   - Filtering transfers by account
--   - Filtering failed logs by user, account, and date
-- ============================================================================

USE banking_db;

-- customers: lookup by user_id is already covered by UNIQUE constraint

-- accounts: filter by customer (dashboard shows all accounts for a customer)
CREATE INDEX idx_accounts_customer_id ON accounts(customer_id);

-- accounts: filter by status (active accounts only)
CREATE INDEX idx_accounts_status ON accounts(status);

-- transactions: filter by account (transaction history)
CREATE INDEX idx_transactions_account_id ON transactions(account_id);

-- transactions: filter by user who performed the action (audit)
CREATE INDEX idx_transactions_performed_by ON transactions(performed_by_user_id);

-- transactions: filter/sort by date (recent transactions, daily reports)
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- transactions: filter by type and status (reports: total deposits, withdrawals)
CREATE INDEX idx_transactions_type_status ON transactions(transaction_type, status);

-- transactions: composite for common query pattern (account history with date sort)
CREATE INDEX idx_transactions_account_date ON transactions(account_id, created_at DESC);

-- transfers: filter by sender account
CREATE INDEX idx_transfers_from_account ON transfers(from_account_id);

-- transfers: filter by receiver account
CREATE INDEX idx_transfers_to_account ON transfers(to_account_id);

-- transfers: filter by status (report: successful transfers)
CREATE INDEX idx_transfers_status ON transfers(status);

-- failed_transaction_log: filter by user (security audit: who triggered failures)
CREATE INDEX idx_failed_log_user_id ON failed_transaction_log(user_id);

-- failed_transaction_log: filter by account
CREATE INDEX idx_failed_log_account_id ON failed_transaction_log(account_id);

-- failed_transaction_log: filter/sort by date (recent failures)
CREATE INDEX idx_failed_log_created_at ON failed_transaction_log(created_at);

DELIMITER //

-- ============================================================================
-- Transfer account validation triggers
-- ============================================================================
-- MySQL 8.0.46 rejects a CHECK constraint on transfer account columns that are
-- also used by foreign keys with referential actions, so these triggers preserve
-- the same invariant.

DROP TRIGGER IF EXISTS trg_transfers_prevent_same_account_insert //
CREATE TRIGGER trg_transfers_prevent_same_account_insert
BEFORE INSERT ON transfers
FOR EACH ROW
BEGIN
    IF NEW.from_account_id = NEW.to_account_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot transfer to the same account';
    END IF;
END //

DROP TRIGGER IF EXISTS trg_transfers_prevent_same_account_update //
CREATE TRIGGER trg_transfers_prevent_same_account_update
BEFORE UPDATE ON transfers
FOR EACH ROW
BEGIN
    IF NEW.from_account_id = NEW.to_account_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot transfer to the same account';
    END IF;
END //

DELIMITER ;

SELECT 'All indexes created successfully.' AS status;
