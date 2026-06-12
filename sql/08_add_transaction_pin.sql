-- ============================================================================
-- Banking Transaction Database System
-- Script 08: Add transaction PIN support to existing databases
-- ============================================================================
-- Run this against an already-created banking_db that predates transaction PINs.
-- Demo PIN for existing users is '1234'.
-- ============================================================================

USE banking_db;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS transaction_pin_hash VARCHAR(255) NULL AFTER password_hash;

UPDATE users
SET transaction_pin_hash = '$2b$10$py2CqIf/SJaQ/T5CtzmrV.FcsviNDtAQ5yBQKjfi5m5GDCFHicQnm'
WHERE transaction_pin_hash IS NULL;

ALTER TABLE users
  MODIFY transaction_pin_hash VARCHAR(255) NOT NULL;
