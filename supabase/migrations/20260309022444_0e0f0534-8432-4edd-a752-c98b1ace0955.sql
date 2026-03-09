
-- Step 1: Add new enum value only
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'aguardando_execucao';
