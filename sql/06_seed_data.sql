-- ============================================================================
-- Banking Transaction Database System
-- Script 06: Seed Data
-- ============================================================================
-- Populates the database with initial data for testing and demonstration.
-- Includes 1 Admin user, 3 Customers, 5 Accounts, and initial transactions.
-- ============================================================================

USE banking_db;

-- 1. Create Admin User
-- Password is 'admin123'
INSERT INTO users (user_id, email, password_hash, role)
VALUES (1, 'admin@bankapp.com', '$2b$10$seQIs4x6FRVIdcXNhpl9veuSnEAq6DnTg17Yqe4mDi76.Ay8igrwu', 'ADMIN');

-- 2. Create Customer Users
-- Passwords are 'password123'
INSERT INTO users (user_id, email, password_hash, role)
VALUES
(2, 'john.doe@example.com', '$2b$10$WkFBYmw2pOM7HJJA8hvwu.PfDfUi4WJmTZitYHRp/4nGrq2HPCqh2', 'CUSTOMER'),
(3, 'jane.smith@example.com', '$2b$10$WkFBYmw2pOM7HJJA8hvwu.PfDfUi4WJmTZitYHRp/4nGrq2HPCqh2', 'CUSTOMER'),
(4, 'mike.jones@example.com', '$2b$10$WkFBYmw2pOM7HJJA8hvwu.PfDfUi4WJmTZitYHRp/4nGrq2HPCqh2', 'CUSTOMER');

-- 3. Create Customer Profiles
INSERT INTO customers (customer_id, user_id, first_name, last_name, phone, address, date_of_birth)
VALUES
(1, 2, 'John', 'Doe', '08012345678', '123 Main St, Lagos', '1990-05-15'),
(2, 3, 'Jane', 'Smith', '08098765432', '456 Broad St, Abuja', '1985-08-22'),
(3, 4, 'Mike', 'Jones', '08122334455', '789 Link Rd, Port Harcourt', '1992-11-10');

-- 4. Create Accounts
INSERT INTO accounts (account_id, customer_id, account_number, account_type, balance, status)
VALUES
(1, 1, 'ACC-20260530-0001', 'SAVINGS', 150000.00, 'ACTIVE'),
(2, 1, 'ACC-20260530-0002', 'CHECKING', 50000.00, 'ACTIVE'),
(3, 2, 'ACC-20260530-0003', 'SAVINGS', 250000.00, 'ACTIVE'),
(4, 3, 'ACC-20260530-0004', 'SAVINGS', 0.00, 'ACTIVE'),
(5, 3, 'ACC-20260530-0005', 'CHECKING', 10000.00, 'ACTIVE');

-- 5. Create Initial Transactions
-- We insert raw transactions here just to populate the DB without running the SPs manually.
-- John deposits 150k to savings
INSERT INTO transactions (transaction_id, transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
VALUES (1, 'TXN-20260530-SEED0001', 1, 2, 'DEPOSIT', 150000.00, 150000.00, 'SUCCESS', 'Initial Deposit');

-- John deposits 50k to checking
INSERT INTO transactions (transaction_id, transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
VALUES (2, 'TXN-20260530-SEED0002', 2, 2, 'DEPOSIT', 50000.00, 50000.00, 'SUCCESS', 'Initial Deposit');

-- Jane deposits 300k to savings
INSERT INTO transactions (transaction_id, transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
VALUES (3, 'TXN-20260530-SEED0003', 3, 3, 'DEPOSIT', 300000.00, 300000.00, 'SUCCESS', 'Initial Deposit');

-- Jane withdraws 50k from savings
INSERT INTO transactions (transaction_id, transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
VALUES (4, 'TXN-20260530-SEED0004', 3, 3, 'WITHDRAWAL', 50000.00, 250000.00, 'SUCCESS', 'ATM Withdrawal');

-- Mike deposits 10k to checking
INSERT INTO transactions (transaction_id, transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
VALUES (5, 'TXN-20260530-SEED0005', 5, 4, 'DEPOSIT', 10000.00, 10000.00, 'SUCCESS', 'Initial Deposit');

-- 6. Create A Transfer (Jane transfers 20k to John)
-- Sender: Jane (Acc 3, User 3)
INSERT INTO transactions (transaction_id, transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
VALUES (6, 'TXN-20260530-SEED0006', 3, 3, 'TRANSFER_OUT', 20000.00, 230000.00, 'SUCCESS', 'Transfer to John');

-- Receiver: John (Acc 1) -- performed_by is Jane because she initiated it
INSERT INTO transactions (transaction_id, transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
VALUES (7, 'TXN-20260530-SEED0007', 1, 3, 'TRANSFER_IN', 20000.00, 170000.00, 'SUCCESS', 'Transfer from Jane');

INSERT INTO transfers (transfer_id, transfer_reference, from_account_id, to_account_id, amount, from_transaction_id, to_transaction_id, status)
VALUES (1, 'TRF-20260530-SEED0001', 3, 1, 20000.00, 6, 7, 'SUCCESS');

-- Note: Balances above intentionally do not reflect the transfer in the account table inserts
-- just to show the starting state. In a real system the current balance is the sum of transactions.
-- Wait, let's fix the account table balances to match the seed transactions.
UPDATE accounts SET balance = 170000.00 WHERE account_id = 1;
UPDATE accounts SET balance = 230000.00 WHERE account_id = 3;

-- 7. Add a failed transaction
INSERT INTO failed_transaction_log (log_id, user_id, account_id, target_account_id, transaction_type, attempted_amount, failure_reason)
VALUES (1, 4, 4, NULL, 'WITHDRAWAL', 5000.00, 'Insufficient funds. Balance: 0.00, Attempted: 5000.00');

INSERT INTO transactions (transaction_id, transaction_reference, account_id, performed_by_user_id, transaction_type, amount, balance_after, status, description)
VALUES (8, 'TXN-20260530-SEED0008', 4, 4, 'WITHDRAWAL', 5000.00, 0.00, 'FAILED', 'Insufficient funds. Balance: 0.00, Attempted: 5000.00');

SELECT 'Seed data inserted successfully.' AS status;
