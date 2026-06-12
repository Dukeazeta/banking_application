-- ============================================================================
-- Banking Transaction Database System
-- Script 04: Stored Procedures
-- ============================================================================
-- Contains all business logic for the banking system.
-- Enforces:
--   1. Database-Level Authorization (verifying p_user_id owns the account)
--   2. Atomicity (START TRANSACTION / COMMIT / ROLLBACK)
--   3. Concurrency Control (SELECT ... FOR UPDATE)
--   4. Deadlock Prevention (Lock ordering by account_id)
--   5. Dual-write Failure Logging
-- ============================================================================

USE banking_db;

DELIMITER //

-- ============================================================================
-- sp_register_customer
-- Creates a user and a customer profile atomically.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_register_customer //
CREATE PROCEDURE sp_register_customer(
    IN p_email VARCHAR(100),
    IN p_password_hash VARCHAR(255),
    IN p_first_name VARCHAR(50),
    IN p_last_name VARCHAR(50),
    IN p_phone VARCHAR(20),
    IN p_address VARCHAR(255),
    IN p_dob DATE
)
BEGIN
    DECLARE v_user_id INT;

    -- Exit handler for errors to ensure rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO users (email, password_hash, role)
    VALUES (p_email, p_password_hash, 'CUSTOMER');

    SET v_user_id = LAST_INSERT_ID();

    INSERT INTO customers (user_id, first_name, last_name, phone, address, date_of_birth)
    VALUES (v_user_id, p_first_name, p_last_name, p_phone, p_address, p_dob);

    COMMIT;
END //

-- ============================================================================
-- sp_open_account
-- Opens a new bank account for a user.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_open_account //
CREATE PROCEDURE sp_open_account(
    IN p_user_id INT,
    IN p_account_type VARCHAR(20)
)
BEGIN
    DECLARE v_customer_id INT;
    DECLARE v_account_number VARCHAR(20);

    -- Get customer_id for the user
    SELECT customer_id INTO v_customer_id
    FROM customers
    WHERE user_id = p_user_id;

    IF v_customer_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User is not a customer.';
    END IF;

    -- Generate a simple 10-digit Nigerian-style account number for this project.
    -- The prefix keeps demo accounts in a recognizable range without implying a real bank.
    SET v_account_number = CONCAT(
        '20',
        LPAD(CAST(FLOOR(RAND() * 100000000) AS CHAR), 8, '0')
    );

    INSERT INTO accounts (customer_id, account_number, account_type, balance, status)
    VALUES (v_customer_id, v_account_number, p_account_type, 0.00, 'ACTIVE');

END //

-- ============================================================================
-- sp_deposit
-- Deposits money into an account, ensuring the user owns it.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_deposit //
CREATE PROCEDURE sp_deposit(
    IN p_user_id INT,
    IN p_account_id INT,
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    DECLARE v_verified_account_id INT;
    DECLARE v_current_balance DECIMAL(15,2);
    DECLARE v_new_balance DECIMAL(15,2);
    DECLARE v_txn_ref VARCHAR(30);

    -- Error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Verify ownership and ACTIVE status, and acquire exclusive lock
    SELECT a.account_id, a.balance INTO v_verified_account_id, v_current_balance
    FROM accounts a
    JOIN customers c ON a.customer_id = c.customer_id
    WHERE a.account_id = p_account_id
      AND c.user_id = p_user_id
      AND a.status = 'ACTIVE'
    FOR UPDATE;

    IF v_verified_account_id IS NULL THEN
        -- Ownership failed or account not active/found
        -- We insert to log, but MUST use an autonomous transaction equivalent or insert before rollback if we were rolling back.
        -- In MySQL, if we rollback the transaction, the log insert is also rolled back.
        -- To persist the log, we can commit it and exit.
        INSERT INTO failed_transaction_log (user_id, account_id, transaction_type, attempted_amount, failure_reason)
        VALUES (p_user_id, p_account_id, 'DEPOSIT', p_amount, 'Account not found, not active, or not owned by user');
        COMMIT;
    ELSE
        SET v_new_balance = v_current_balance + p_amount;
        SET v_txn_ref = CONCAT('TXN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(UUID(), 1, 8)));

        -- Update balance
        UPDATE accounts SET balance = v_new_balance WHERE account_id = p_account_id;

        -- Record transaction
        INSERT INTO transactions (transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
        VALUES (v_txn_ref, p_account_id, p_user_id, 'DEPOSIT', p_amount, v_new_balance, 'SUCCESS', p_description);

        COMMIT;
    END IF;
END //

-- ============================================================================
-- sp_withdraw
-- Withdraws money from an account.
-- Checks ownership, acquires row lock, checks balance.
-- Implements dual-write failure logging.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_withdraw //
CREATE PROCEDURE sp_withdraw(
    IN p_user_id INT,
    IN p_account_id INT,
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    DECLARE v_verified_account_id INT;
    DECLARE v_current_balance DECIMAL(15,2);
    DECLARE v_new_balance DECIMAL(15,2);
    DECLARE v_txn_ref VARCHAR(30);
    DECLARE v_failure_reason VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT a.account_id, a.balance INTO v_verified_account_id, v_current_balance
    FROM accounts a
    JOIN customers c ON a.customer_id = c.customer_id
    WHERE a.account_id = p_account_id
      AND c.user_id = p_user_id
      AND a.status = 'ACTIVE'
    FOR UPDATE;

    SET v_txn_ref = CONCAT('TXN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(UUID(), 1, 8)));

    IF v_verified_account_id IS NULL THEN
        INSERT INTO failed_transaction_log (user_id, account_id, transaction_type, attempted_amount, failure_reason)
        VALUES (p_user_id, p_account_id, 'WITHDRAWAL', p_amount, 'Account not found, not active, or not owned by user');
        COMMIT;
    ELSEIF v_current_balance < p_amount THEN
        -- Insufficient funds: Dual-write failure
        SET v_failure_reason = CONCAT('Insufficient funds. Balance: ', v_current_balance, ', Attempted: ', p_amount);

        INSERT INTO failed_transaction_log (user_id, account_id, transaction_type, attempted_amount, failure_reason)
        VALUES (p_user_id, p_account_id, 'WITHDRAWAL', p_amount, v_failure_reason);

        INSERT INTO transactions (transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
        VALUES (v_txn_ref, p_account_id, p_user_id, 'WITHDRAWAL', p_amount, v_current_balance, 'FAILED', v_failure_reason);

        COMMIT;
    ELSE
        SET v_new_balance = v_current_balance - p_amount;

        UPDATE accounts SET balance = v_new_balance WHERE account_id = p_account_id;

        INSERT INTO transactions (transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
        VALUES (v_txn_ref, p_account_id, p_user_id, 'WITHDRAWAL', p_amount, v_new_balance, 'SUCCESS', p_description);

        COMMIT;
    END IF;
END //

-- ============================================================================
-- sp_transfer
-- Transfers money between accounts.
-- Uses lock ordering to prevent deadlocks.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_transfer //
CREATE PROCEDURE sp_transfer(
    IN p_user_id INT,
    IN p_from_account_id INT,
    IN p_to_account_number VARCHAR(20),
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    DECLARE v_verified_from_id INT;
    DECLARE v_to_account_id INT;
    DECLARE v_from_balance DECIMAL(15,2);
    DECLARE v_to_balance DECIMAL(15,2);
    DECLARE v_to_status VARCHAR(20);

    DECLARE v_from_txn_ref VARCHAR(30);
    DECLARE v_to_txn_ref VARCHAR(30);
    DECLARE v_trf_ref VARCHAR(30);
    DECLARE v_from_txn_id INT;
    DECLARE v_to_txn_id INT;
    DECLARE v_failure_reason VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Verify Sender Ownership (Without locking yet to keep it fast)
    SELECT a.account_id INTO v_verified_from_id
    FROM accounts a
    JOIN customers c ON a.customer_id = c.customer_id
    WHERE a.account_id = p_from_account_id
      AND c.user_id = p_user_id
      AND a.status = 'ACTIVE';

    -- 2. Resolve Target Account ID
    SELECT account_id, status INTO v_to_account_id, v_to_status
    FROM accounts
    WHERE account_number = p_to_account_number;

    IF v_verified_from_id IS NULL THEN
        INSERT INTO failed_transaction_log (user_id, account_id, target_account_id, transaction_type, attempted_amount, failure_reason)
        VALUES (p_user_id, p_from_account_id, v_to_account_id, 'TRANSFER_OUT', p_amount, 'Source account not found, not active, or not owned by user');
        COMMIT;
    ELSEIF v_to_account_id IS NULL OR v_to_status <> 'ACTIVE' THEN
        INSERT INTO failed_transaction_log (user_id, account_id, target_account_id, transaction_type, attempted_amount, failure_reason)
        VALUES (p_user_id, p_from_account_id, v_to_account_id, 'TRANSFER_OUT', p_amount, 'Destination account not found or not active');
        COMMIT;
    ELSEIF p_from_account_id = v_to_account_id THEN
        INSERT INTO failed_transaction_log (user_id, account_id, target_account_id, transaction_type, attempted_amount, failure_reason)
        VALUES (p_user_id, p_from_account_id, v_to_account_id, 'TRANSFER_OUT', p_amount, 'Cannot transfer to the same account');
        COMMIT;
    ELSE
        -- 3. Lock Ordering to Prevent Deadlocks
        IF p_from_account_id < v_to_account_id THEN
            SELECT balance INTO v_from_balance FROM accounts WHERE account_id = p_from_account_id FOR UPDATE;
            SELECT balance INTO v_to_balance FROM accounts WHERE account_id = v_to_account_id FOR UPDATE;
        ELSE
            SELECT balance INTO v_to_balance FROM accounts WHERE account_id = v_to_account_id FOR UPDATE;
            SELECT balance INTO v_from_balance FROM accounts WHERE account_id = p_from_account_id FOR UPDATE;
        END IF;

        SET v_from_txn_ref = CONCAT('TXN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(UUID(), 1, 8)));
        SET v_to_txn_ref = CONCAT('TXN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(UUID(), 1, 8)));
        SET v_trf_ref = CONCAT('TRF-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(UUID(), 1, 8)));

        -- 4. Check Balance
        IF v_from_balance < p_amount THEN
            SET v_failure_reason = CONCAT('Insufficient funds for transfer. Balance: ', v_from_balance);

            INSERT INTO failed_transaction_log (user_id, account_id, target_account_id, transaction_type, attempted_amount, failure_reason)
            VALUES (p_user_id, p_from_account_id, v_to_account_id, 'TRANSFER_OUT', p_amount, v_failure_reason);

            INSERT INTO transactions (transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
            VALUES (v_from_txn_ref, p_from_account_id, p_user_id, 'TRANSFER_OUT', p_amount, v_from_balance, 'FAILED', v_failure_reason);

            INSERT INTO transfers (transfer_reference, from_account_id, to_account_id, amount, status)
            VALUES (v_trf_ref, p_from_account_id, v_to_account_id, p_amount, 'FAILED');

            COMMIT;
        ELSE
            -- 5. Execute Transfer
            -- Debit sender
            UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_from_account_id;
            INSERT INTO transactions (transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
            VALUES (v_from_txn_ref, p_from_account_id, p_user_id, 'TRANSFER_OUT', p_amount, v_from_balance - p_amount, 'SUCCESS', p_description);
            SET v_from_txn_id = LAST_INSERT_ID();

            -- Credit receiver
            UPDATE accounts SET balance = balance + p_amount WHERE account_id = v_to_account_id;
            -- Note: We attribute the receiving transaction to the sender's user_id as they performed the action
            INSERT INTO transactions (transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
            VALUES (v_to_txn_ref, v_to_account_id, p_user_id, 'TRANSFER_IN', p_amount, v_to_balance + p_amount, 'SUCCESS', p_description);
            SET v_to_txn_id = LAST_INSERT_ID();

            -- Link transfer
            INSERT INTO transfers (transfer_reference, from_account_id, to_account_id, amount, from_transaction_id, to_transaction_id, status)
            VALUES (v_trf_ref, p_from_account_id, v_to_account_id, p_amount, v_from_txn_id, v_to_txn_id, 'SUCCESS');

            COMMIT;
        END IF;
    END IF;
END //

-- ============================================================================
-- sp_get_balance
-- Safely gets the balance of an account owned by the user.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_get_balance //
CREATE PROCEDURE sp_get_balance(
    IN p_user_id INT,
    IN p_account_id INT
)
BEGIN
    SELECT a.balance
    FROM accounts a
    JOIN customers c ON a.customer_id = c.customer_id
    WHERE a.account_id = p_account_id
      AND c.user_id = p_user_id;
END //

-- ============================================================================
-- sp_transaction_history
-- Gets the full transaction history for an account owned by the user.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_transaction_history //
CREATE PROCEDURE sp_transaction_history(
    IN p_user_id INT,
    IN p_account_id INT
)
BEGIN
    DECLARE v_verified INT;

    SELECT a.account_id INTO v_verified
    FROM accounts a
    JOIN customers c ON a.customer_id = c.customer_id
    WHERE a.account_id = p_account_id
      AND c.user_id = p_user_id;

    IF v_verified IS NOT NULL THEN
        SELECT *
        FROM transactions
        WHERE account_id = p_account_id
        ORDER BY created_at DESC;
    ELSE
        -- Return empty result set if unauthorized
        SELECT * FROM transactions WHERE 1=0;
    END IF;
END //

-- ============================================================================
-- sp_mini_statement
-- Gets the last 5 transactions for an account owned by the user.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_mini_statement //
CREATE PROCEDURE sp_mini_statement(
    IN p_user_id INT,
    IN p_account_id INT
)
BEGIN
    DECLARE v_verified INT;

    SELECT a.account_id INTO v_verified
    FROM accounts a
    JOIN customers c ON a.customer_id = c.customer_id
    WHERE a.account_id = p_account_id
      AND c.user_id = p_user_id;

    IF v_verified IS NOT NULL THEN
        SELECT *
        FROM transactions
        WHERE account_id = p_account_id
        ORDER BY created_at DESC
        LIMIT 5;
    ELSE
        -- Return empty result set if unauthorized
        SELECT * FROM transactions WHERE 1=0;
    END IF;
END //

-- ============================================================================
-- sp_banking_report
-- Generates aggregate statistics. Admin only. (Authorization enforced at API level)
-- Returns multiple result sets.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_banking_report //
CREATE PROCEDURE sp_banking_report()
BEGIN
    -- Result 1: System Totals
    SELECT
        (SELECT COUNT(*) FROM customers) AS total_customers,
        (SELECT COUNT(*) FROM accounts) AS total_accounts,
        (SELECT SUM(balance) FROM accounts WHERE status='ACTIVE') AS total_balance,
        (SELECT COUNT(*) FROM failed_transaction_log) AS total_failed_transactions;

    -- Result 2: Totals by Transaction Type
    SELECT
        transaction_type,
        COUNT(*) AS tx_count,
        SUM(amount) AS total_amount
    FROM transactions
    WHERE status = 'SUCCESS'
    GROUP BY transaction_type;

    -- Result 3: Account Balances by Type
    SELECT
        account_type,
        COUNT(*) AS account_count,
        SUM(balance) AS total_balance
    FROM accounts
    WHERE status = 'ACTIVE'
    GROUP BY account_type;
END //

DELIMITER ;

SELECT 'All stored procedures created successfully.' AS status;
