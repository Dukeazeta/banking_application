-- ============================================================================
-- Banking Transaction Database System
-- Script 09: Add teller deposits to existing databases
-- ============================================================================
-- Adds the TELLER role, teller profile table, demo teller, nullable failed-log
-- account IDs for account-number misses, teller-safe failed-log view joins,
-- and the teller-only account-number deposit stored procedure.
-- ============================================================================

USE banking_db;

ALTER TABLE users
  MODIFY role ENUM('CUSTOMER', 'ADMIN', 'TELLER') NOT NULL DEFAULT 'CUSTOMER';

CREATE TABLE IF NOT EXISTS tellers (
    teller_id       INT             AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    staff_code      VARCHAR(20)     NOT NULL,
    first_name      VARCHAR(50)     NOT NULL,
    last_name       VARCHAR(50)     NOT NULL,
    phone           VARCHAR(20)     DEFAULT NULL,
    status          ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_tellers_user_id UNIQUE (user_id),
    CONSTRAINT uq_tellers_staff_code UNIQUE (staff_code),
    CONSTRAINT fk_tellers_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (email, password_hash, transaction_pin_hash, role)
SELECT
  'teller@bankapp.com',
  '$2b$10$WkFBYmw2pOM7HJJA8hvwu.PfDfUi4WJmTZitYHRp/4nGrq2HPCqh2',
  '$2b$10$py2CqIf/SJaQ/T5CtzmrV.FcsviNDtAQ5yBQKjfi5m5GDCFHicQnm',
  'TELLER'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'teller@bankapp.com'
);

INSERT INTO tellers (user_id, staff_code, first_name, last_name, phone, status)
SELECT u.user_id, 'TL001', 'Bola', 'Adewale', '08055550101', 'ACTIVE'
FROM users u
WHERE u.email = 'teller@bankapp.com'
  AND NOT EXISTS (
    SELECT 1 FROM tellers t WHERE t.user_id = u.user_id
  );

ALTER TABLE failed_transaction_log
  MODIFY account_id INT DEFAULT NULL;

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

DROP PROCEDURE IF EXISTS sp_deposit;

DELIMITER //
CREATE PROCEDURE sp_deposit(
    IN p_teller_user_id INT,
    IN p_account_number VARCHAR(20),
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    DECLARE v_verified_teller_id INT;
    DECLARE v_account_id INT;
    DECLARE v_current_balance DECIMAL(15,2);
    DECLARE v_new_balance DECIMAL(15,2);
    DECLARE v_txn_ref VARCHAR(30);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT u.user_id INTO v_verified_teller_id
    FROM users u
    JOIN tellers t ON t.user_id = u.user_id
    WHERE u.user_id = p_teller_user_id
      AND u.role = 'TELLER'
      AND t.status = 'ACTIVE';

    SELECT account_id, balance INTO v_account_id, v_current_balance
    FROM accounts
    WHERE account_number = p_account_number
      AND status = 'ACTIVE'
    FOR UPDATE;

    IF v_verified_teller_id IS NULL THEN
        INSERT INTO failed_transaction_log (user_id, account_id, transaction_type, attempted_amount, failure_reason)
        VALUES (p_teller_user_id, v_account_id, 'DEPOSIT', p_amount, 'Teller not found or inactive');
        COMMIT;
    ELSEIF v_account_id IS NULL THEN
        INSERT INTO failed_transaction_log (user_id, account_id, transaction_type, attempted_amount, failure_reason)
        VALUES (p_teller_user_id, NULL, 'DEPOSIT', p_amount, 'Destination account not found or not active');
        COMMIT;
    ELSE
        SET v_new_balance = v_current_balance + p_amount;
        SET v_txn_ref = CONCAT('TXN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(UUID(), 1, 8)));

        UPDATE accounts SET balance = v_new_balance WHERE account_id = v_account_id;

        INSERT INTO transactions (transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
        VALUES (v_txn_ref, v_account_id, p_teller_user_id, 'DEPOSIT', p_amount, v_new_balance, 'SUCCESS', p_description);

        COMMIT;
    END IF;
END //
DELIMITER ;
