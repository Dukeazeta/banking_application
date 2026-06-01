-- ============================================================================
-- Banking Transaction Database System
-- Script 07: Verification Tests
-- ============================================================================
-- These tests prove that the stored procedures enforce business rules correctly.
-- They can be executed manually to verify the database behavior.
-- ============================================================================

USE banking_db;

SELECT '============================================' AS '---';
SELECT 'TEST 1: Successful Deposit' AS '---';
SELECT '============================================' AS '---';

-- Check starting balance of Mike (User 4, Account 5) -> Should be 10,000
SELECT balance AS starting_balance FROM accounts WHERE account_id = 5;

-- Mike deposits 5,000
CALL sp_deposit(4, 5, 5000.00, 'Test Deposit');

-- Verify balance is now 15,000
SELECT balance AS new_balance FROM accounts WHERE account_id = 5;


SELECT '============================================' AS '---';
SELECT 'TEST 2: Successful Withdrawal' AS '---';
SELECT '============================================' AS '---';

-- Mike withdraws 2,000
CALL sp_withdraw(4, 5, 2000.00, 'Test Withdrawal');

-- Verify balance is now 13,000
SELECT balance AS new_balance FROM accounts WHERE account_id = 5;


SELECT '============================================' AS '---';
SELECT 'TEST 3: Failed Withdrawal (Insufficient Funds)' AS '---';
SELECT '============================================' AS '---';

-- Mike tries to withdraw 50,000 (only has 13,000)
CALL sp_withdraw(4, 5, 50000.00, 'Greedy Withdrawal');

-- Verify balance is STILL 13,000
SELECT balance AS unchanged_balance FROM accounts WHERE account_id = 5;

-- Verify it was logged in failed_transaction_log
SELECT transaction_type, attempted_amount, failure_reason
FROM failed_transaction_log
WHERE user_id = 4 ORDER BY created_at DESC LIMIT 1;


SELECT '============================================' AS '---';
SELECT 'TEST 4: Successful Transfer' AS '---';
SELECT '============================================' AS '---';

-- Mike (User 4, Acc 5) transfers 3,000 to John (Acc 1)
-- Check John's starting balance
SELECT balance AS john_start_balance FROM accounts WHERE account_id = 1;

-- Get John's account number
SELECT @john_acc_num := account_number FROM accounts WHERE account_id = 1;

CALL sp_transfer(4, 5, @john_acc_num, 3000.00, 'Test Transfer to John');

-- Verify Mike's balance is down to 10,000
SELECT balance AS mike_new_balance FROM accounts WHERE account_id = 5;

-- Verify John's balance went up by 3,000
SELECT balance AS john_new_balance FROM accounts WHERE account_id = 1;


SELECT '============================================' AS '---';
SELECT 'TEST 5: Failed Transfer (Insufficient Funds)' AS '---';
SELECT '============================================' AS '---';

-- Mike (Acc 5) tries to transfer 100,000 to John
CALL sp_transfer(4, 5, @john_acc_num, 100000.00, 'Failed Transfer');

-- Verify Mike's balance is unchanged (still 10,000)
SELECT balance AS mike_unchanged_balance FROM accounts WHERE account_id = 5;

-- Verify failure was logged
SELECT failure_reason FROM failed_transaction_log
WHERE user_id = 4 ORDER BY created_at DESC LIMIT 1;


SELECT '============================================' AS '---';
SELECT 'TEST 6: Failed Transfer (Same Account)' AS '---';
SELECT '============================================' AS '---';

-- Get Mike's own account number
SELECT @mike_acc_num := account_number FROM accounts WHERE account_id = 5;

-- Mike tries to transfer to himself
CALL sp_transfer(4, 5, @mike_acc_num, 1000.00, 'Self Transfer');

-- Verify failure was logged
SELECT failure_reason FROM failed_transaction_log
WHERE user_id = 4 ORDER BY created_at DESC LIMIT 1;


SELECT '============================================' AS '---';
SELECT 'TEST 7: Unauthorized Withdrawal' AS '---';
SELECT '============================================' AS '---';

-- Mike (User 4) tries to withdraw from John's account (Account 1)
CALL sp_withdraw(4, 1, 1000.00, 'Theft Attempt');

-- Verify John's balance is unchanged
SELECT balance AS safe_balance FROM accounts WHERE account_id = 1;

-- Verify failure was logged (should say "Account not found, not active, or not owned")
SELECT failure_reason FROM failed_transaction_log
WHERE user_id = 4 ORDER BY created_at DESC LIMIT 1;


SELECT '============================================' AS '---';
SELECT 'TEST 8 & 9: History & Mini Statement' AS '---';
SELECT '============================================' AS '---';

-- Get history for Mike's account
CALL sp_transaction_history(4, 5);

-- Get mini statement for Mike
CALL sp_mini_statement(4, 5);


SELECT '============================================' AS '---';
SELECT 'TEST 10: Banking Reports' AS '---';
SELECT '============================================' AS '---';

-- Run the admin report
CALL sp_banking_report();

SELECT 'All tests completed.' AS status;
