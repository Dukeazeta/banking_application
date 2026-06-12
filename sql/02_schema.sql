-- ============================================================================
-- Banking Transaction Database System
-- Script 02: Schema (Table Definitions)
-- ============================================================================
-- Creates all 7 tables with full constraints, foreign keys, CHECK constraints,
-- and audit fields. All tables use InnoDB for transaction and FK support.
--
-- Table order matters due to foreign key dependencies:
--   1. users           (no dependencies)
--   2. customers       (depends on users)
--   3. tellers         (depends on users)
--   4. accounts        (depends on customers)
--   5. transactions    (depends on accounts, users)
--   6. transfers       (depends on accounts, transactions)
--   7. failed_transaction_log (depends on users, accounts)
-- ============================================================================

USE banking_db;

-- ============================================================================
-- TABLE 1: users
-- Stores authentication credentials for all system users (customers and admins).
-- Passwords are stored as bcrypt hashes, never as plain text.
-- ============================================================================
CREATE TABLE users (
    user_id         INT             AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(100)    NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    transaction_pin_hash VARCHAR(255) NOT NULL,
    role            ENUM('CUSTOMER', 'ADMIN', 'TELLER') NOT NULL DEFAULT 'CUSTOMER',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- TABLE 2: customers
-- Stores personal profile information for banking customers.
-- Each customer is linked 1:1 to a user record for authentication.
-- Separated from users because admins are users but NOT customers.
-- ============================================================================
CREATE TABLE customers (
    customer_id     INT             AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    first_name      VARCHAR(50)     NOT NULL,
    last_name       VARCHAR(50)     NOT NULL,
    phone           VARCHAR(20)     DEFAULT NULL,
    address         VARCHAR(255)    DEFAULT NULL,
    date_of_birth   DATE            NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_customers_user_id UNIQUE (user_id),
    CONSTRAINT fk_customers_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- ============================================================================
-- TABLE 3: tellers
-- Stores staff profile information for teller users who can post deposits.
-- ============================================================================
CREATE TABLE tellers (
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


-- ============================================================================
-- TABLE 4: accounts
-- Stores bank accounts. Each customer can own multiple accounts.
-- Balance is stored directly for performance (denormalized) but is ONLY
-- updated through stored procedures inside locked transactions.
-- Uses DECIMAL(15,2) for exact monetary arithmetic (never FLOAT).
-- ============================================================================
CREATE TABLE accounts (
    account_id      INT             AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT             NOT NULL,
    account_number  VARCHAR(20)     NOT NULL,
    account_type    ENUM('SAVINGS', 'CURRENT') NOT NULL,
    balance         DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    status          ENUM('ACTIVE', 'CLOSED', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
    opened_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at       TIMESTAMP       NULL DEFAULT NULL,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_accounts_number UNIQUE (account_number),
    CONSTRAINT chk_accounts_balance CHECK (balance >= 0),
    CONSTRAINT fk_accounts_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- TABLE 5: transactions
-- The permanent ledger. Every money movement (deposit, withdrawal, transfer)
-- creates a row here. Rows are NEVER deleted or modified after creation.
--
-- Key design decisions:
--   - transaction_reference: unique human-readable ID for traceability
--   - performed_by_user_id: audit trail -- who triggered this transaction
--   - balance_after: snapshot of account balance after this transaction,
--     enabling point-in-time balance reconstruction
--   - Failed transactions are recorded with status='FAILED' and
--     balance_after = the unchanged current balance (dual-write strategy)
-- ============================================================================
CREATE TABLE transactions (
    transaction_id      INT             AUTO_INCREMENT PRIMARY KEY,
    transaction_reference VARCHAR(30)   NOT NULL,
    account_id          INT             NOT NULL,
    performed_by_user_id INT            NOT NULL,
    transaction_type    ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT') NOT NULL,
    amount              DECIMAL(15,2)   NOT NULL,
    balance_after       DECIMAL(15,2)   NOT NULL,
    status              ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
    description         VARCHAR(255)    DEFAULT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_transactions_reference UNIQUE (transaction_reference),
    CONSTRAINT chk_transactions_amount CHECK (amount > 0),
    CONSTRAINT fk_transactions_account
        FOREIGN KEY (account_id) REFERENCES accounts(account_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_transactions_user
        FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- TABLE 6: transfers
-- Links two transaction records (TRANSFER_OUT + TRANSFER_IN) that form a
-- single fund transfer. Without this table, there is no way to answer
-- "show all transfers from Account A to Account B."
--
-- Key design decisions:
--   - transfer_reference: unique human-readable ID for the transfer
--   - Triggers prevent transfers to the same account
--   - Failed transfers are recorded with status='FAILED' and NULL
--     transaction IDs (since no actual transactions were created)
-- ============================================================================
CREATE TABLE transfers (
    transfer_id         INT             AUTO_INCREMENT PRIMARY KEY,
    transfer_reference  VARCHAR(30)     NOT NULL,
    from_account_id     INT             NOT NULL,
    to_account_id       INT             NOT NULL,
    amount              DECIMAL(15,2)   NOT NULL,
    from_transaction_id INT             DEFAULT NULL,
    to_transaction_id   INT             DEFAULT NULL,
    status              ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_transfers_reference UNIQUE (transfer_reference),
    CONSTRAINT chk_transfers_amount CHECK (amount > 0),
    CONSTRAINT fk_transfers_from_account
        FOREIGN KEY (from_account_id) REFERENCES accounts(account_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_transfers_to_account
        FOREIGN KEY (to_account_id) REFERENCES accounts(account_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_transfers_from_txn
        FOREIGN KEY (from_transaction_id) REFERENCES transactions(transaction_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_transfers_to_txn
        FOREIGN KEY (to_transaction_id) REFERENCES transactions(transaction_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- TABLE 7: failed_transaction_log
-- Dedicated audit table for rejected operations. Records WHY a transaction
-- was rejected, WHO attempted it, and WHICH accounts were involved.
--
-- This is separate from the transactions table because:
--   - It includes the failure_reason (not relevant for successful transactions)
--   - It tracks the user_id who attempted the action (for security auditing)
--   - It optionally tracks target_account_id for failed transfers
--   - Admins use this table to monitor suspicious activity
-- ============================================================================
CREATE TABLE failed_transaction_log (
    log_id              INT             AUTO_INCREMENT PRIMARY KEY,
    user_id             INT             NOT NULL,
    account_id          INT             DEFAULT NULL,
    target_account_id   INT             DEFAULT NULL,
    transaction_type    VARCHAR(30)     NOT NULL,
    attempted_amount    DECIMAL(15,2)   NOT NULL,
    failure_reason      VARCHAR(255)    NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_failed_log_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_failed_log_account
        FOREIGN KEY (account_id) REFERENCES accounts(account_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_failed_log_target_account
        FOREIGN KEY (target_account_id) REFERENCES accounts(account_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- Verify all tables created
-- ============================================================================
SELECT 'All 7 tables created successfully.' AS status;
SHOW TABLES;
