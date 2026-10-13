-- 000008_add_sauces_to_cost_calculations.down.sql
ALTER TABLE cost_calculations
DROP COLUMN IF EXISTS sauces_total_cost,
DROP COLUMN IF EXISTS sauces_data;
