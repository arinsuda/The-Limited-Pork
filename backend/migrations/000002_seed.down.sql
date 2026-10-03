-- 000002_seed.down.sql

DELETE FROM settings WHERE key IN ('shop.name', 'shop.currency', 'shop.timezone', 'trial.passScoreThreshold', 'trial.defaultTasterName');
DELETE FROM ingredients WHERE code LIKE 'ING_%';
DELETE FROM process_step_types;
DELETE FROM lookups;
DELETE FROM lookup_categories;
DELETE FROM taste_attributes;
DELETE FROM units;
DELETE FROM role_permissions;
DELETE FROM roles;
DELETE FROM permissions;
