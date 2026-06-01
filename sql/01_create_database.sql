-- ============================================================================
-- Banking Transaction Database System
-- Script 01: Create Database
-- ============================================================================
-- This script creates the banking_db database with proper character encoding.
-- Run this FIRST before any other scripts.
-- ============================================================================

DROP DATABASE IF EXISTS banking_db;

CREATE DATABASE banking_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE banking_db;

-- Verify creation
SELECT 'Database banking_db created successfully.' AS status;
