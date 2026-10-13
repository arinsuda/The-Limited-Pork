-- 000008_add_sauces_to_cost_calculations.up.sql
ALTER TABLE cost_calculations
ADD COLUMN IF NOT EXISTS sauces_total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS sauces_data JSONB NOT NULL DEFAULT '[]'::jsonb;
