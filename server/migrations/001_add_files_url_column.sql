-- Migration: Add url column to files table (run if upgrading from an older schema)
ALTER TABLE files ADD COLUMN IF NOT EXISTS url VARCHAR(1000) AFTER folder;
