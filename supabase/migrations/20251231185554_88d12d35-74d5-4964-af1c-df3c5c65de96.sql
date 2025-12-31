-- Step 1: Add new status values to request_status enum
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'liberado_fornecedor';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'enviado_fornecedor';