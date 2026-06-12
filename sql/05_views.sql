-- ============================================================================
-- Banking Transaction Database System
-- Script 05: Views
-- ============================================================================
-- Pre-built queries for reporting and quick data retrieval.
-- ============================================================================

USE banking_db;

-- ============================================================================
-- vw_account_balance
-- Joins accounts, customers, and users for a complete picture of an account.
-- ============================================================================
CREATE OR REPLACE VIEW vw_account_balance AS
SELECT
    a.account_id,
    a.account_number,
    a.account_type,
    a.balance,
    a.status,
    c.customer_id,
    c.first_name,
    c.last_name,
    u.user_id,
    u.email
FROM accounts a
JOIN customers c ON a.customer_id = c.customer_id
JOIN users u ON c.user_id = u.user_id;

-- ============================================================================
-- vw_transaction_history
-- Full audit trail with readable names.
-- ============================================================================
CREATE OR REPLACE VIEW vw_transaction_history AS
SELECT
    t.transaction_id,
    t.transaction_reference,
    a.account_number,
    c.first_name AS owner_first_name,
    c.last_name AS owner_last_name,
    u.email AS performed_by_email,
    t.transaction_type,
    t.amount,
    t.balance_after,
    t.status,
    t.description,
    t.created_at
FROM transactions t
JOIN accounts a ON t.account_id = a.account_id
JOIN customers c ON a.customer_id = c.customer_id
JOIN users u ON t.performed_by_user_id = u.user_id
ORDER BY t.created_at DESC;

-- ============================================================================
-- vw_customer_accounts
-- Customer portfolio overview.
-- ============================================================================
CREATE OR REPLACE VIEW vw_customer_accounts AS
SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    u.email,
    COUNT(a.account_id) AS total_accounts,
    COALESCE(SUM(a.balance), 0.00) AS total_balance
FROM customers c
JOIN users u ON c.user_id = u.user_id
LEFT JOIN accounts a ON c.customer_id = a.customer_id AND a.status = 'ACTIVE'
GROUP BY c.customer_id, c.first_name, c.last_name, u.email;

-- ============================================================================
-- vw_failed_transaction_log
-- Admin view for failed transaction audit.
-- ============================================================================
CREATE OR REPLACE VIEW vw_failed_transaction_log AS
SELECT
    f.log_id,
    u.email AS attempted_by,
    a.account_number AS source_account,
    ta.account_number AS target_account,
    f.transaction_type,
    f.attempted_amount,
    f.failure_reason,
    f.created_at
FROM failed_transaction_log f
JOIN users u ON f.user_id = u.user_id
LEFT JOIN accounts a ON f.account_id = a.account_id
LEFT JOIN accounts ta ON f.target_account_id = ta.account_id
ORDER BY f.created_at DESC;

-- ============================================================================
-- vw_banking_report
-- Summary statistics for admin dashboard.
-- ============================================================================
CREATE OR REPLACE VIEW vw_banking_report AS
SELECT
    (SELECT COUNT(*) FROM customers) AS total_customers,
    (SELECT COUNT(*) FROM accounts) AS total_accounts,
    (SELECT SUM(balance) FROM accounts WHERE status='ACTIVE') AS total_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type='DEPOSIT' AND status='SUCCESS') AS total_deposits,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type='WITHDRAWAL' AND status='SUCCESS') AS total_withdrawals,
    (SELECT COUNT(*) FROM transfers WHERE status='SUCCESS') AS total_transfers,
    (SELECT COUNT(*) FROM failed_transaction_log) AS total_failed_txns;

SELECT 'All 5 views created successfully.' AS status;
