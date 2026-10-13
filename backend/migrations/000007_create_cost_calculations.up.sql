-- 000007_create_cost_calculations.up.sql

CREATE TABLE IF NOT EXISTS cost_calculations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    recipe_version_id UUID REFERENCES recipe_versions(id) ON DELETE SET NULL,
    notes TEXT,

    -- Raw Material & Yield parameters
    raw_weight_kg NUMERIC(10, 4) NOT NULL DEFAULT 10.0,
    cooked_weight_kg NUMERIC(10, 4) NOT NULL DEFAULT 6.0,
    yield_pct NUMERIC(6, 2) NOT NULL DEFAULT 60.0,
    shrinkage_pct NUMERIC(6, 2) NOT NULL DEFAULT 40.0,
    wastage_pct NUMERIC(6, 2) NOT NULL DEFAULT 3.0,

    -- Cost breakdown totals
    ingredients_total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    operations_total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    packaging_total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    wastage_total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_batch_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    cost_per_raw_kg NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    cost_per_cooked_kg NUMERIC(12, 2) NOT NULL DEFAULT 0.0,

    -- Portion & Selling Price
    portion_weight_g NUMERIC(10, 2) NOT NULL DEFAULT 150.0,
    total_portions NUMERIC(10, 2) NOT NULL DEFAULT 40.0,
    cost_per_portion NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    target_food_cost_pct NUMERIC(6, 2) NOT NULL DEFAULT 35.0,
    recommended_price_by_food_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    target_margin_pct NUMERIC(6, 2) NOT NULL DEFAULT 65.0,
    recommended_price_by_margin NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    actual_price_per_portion NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    gross_profit_per_portion NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    gross_profit_margin_pct NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    actual_food_cost_pct NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    total_batch_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_batch_gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    break_even_portions NUMERIC(10, 2) NOT NULL DEFAULT 0.0,

    -- Structured itemized breakdowns
    ingredients_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    operations_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    packaging_data JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cost_calculations_recipe_id ON cost_calculations(recipe_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_calculations_created_at ON cost_calculations(created_at DESC) WHERE deleted_at IS NULL;

-- Permissions
INSERT INTO permissions (code, description_th, description_en, group_name) VALUES
    ('costing.read', 'ดูการคำนวณต้นทุนขาย', 'View cost calculations', 'costing'),
    ('costing.write', 'คำนวณและบันทึกต้นทุนขาย', 'Manage cost calculations', 'costing')
ON CONFLICT (code) DO NOTHING;

-- Grant to OWNER and MANAGER
INSERT INTO role_permissions (role_id, permission_code)
SELECT id, 'costing.read' FROM roles WHERE code IN ('OWNER', 'MANAGER')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT id, 'costing.write' FROM roles WHERE code IN ('OWNER', 'MANAGER')
ON CONFLICT DO NOTHING;
