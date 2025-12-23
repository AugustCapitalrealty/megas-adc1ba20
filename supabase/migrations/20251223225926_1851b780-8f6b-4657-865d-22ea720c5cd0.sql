-- Adicionar novos valores ao enum tipo_contratacao
ALTER TYPE public.tipo_contratacao ADD VALUE IF NOT EXISTS 'agua';
ALTER TYPE public.tipo_contratacao ADD VALUE IF NOT EXISTS 'energia';