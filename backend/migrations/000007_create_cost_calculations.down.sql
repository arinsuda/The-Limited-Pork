-- 000007_create_cost_calculations.down.sql

DROP TABLE IF EXISTS cost_calculations CASCADE;
DELETE FROM role_permissions WHERE permission_code IN ('costing.read', 'costing.write');
DELETE FROM permissions WHERE code IN ('costing.read', 'costing.write');
