-- 000001_init.up.sql

CREATE TABLE IF NOT EXISTS permissions (
    code VARCHAR(50) PRIMARY KEY,
    description_th VARCHAR(255) NOT NULL,
    description_en VARCHAR(255) NOT NULL,
    group_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_code VARCHAR(50) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    locale VARCHAR(10) NOT NULL DEFAULT 'th',
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    family_id UUID NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    dimension VARCHAR(50) NOT NULL,
    base_unit_id UUID REFERENCES units(id),
    factor_to_base NUMERIC(15, 6) NOT NULL DEFAULT 1.0,
    name_th VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_units_code ON units(code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS taste_attributes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_th TEXT,
    description_en TEXT,
    min_score INT NOT NULL DEFAULT 1,
    max_score INT NOT NULL DEFAULT 5,
    color VARCHAR(20) NOT NULL DEFAULT '#f97316',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_taste_attributes_code ON taste_attributes(code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS process_step_types (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    uses_temperature BOOLEAN NOT NULL DEFAULT false,
    uses_duration BOOLEAN NOT NULL DEFAULT false,
    uses_orientation BOOLEAN NOT NULL DEFAULT false,
    is_repeatable BOOLEAN NOT NULL DEFAULT false,
    param_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_process_step_types_code ON process_step_types(code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lookup_categories (
    code VARCHAR(50) PRIMARY KEY,
    name_th VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS lookups (
    id UUID PRIMARY KEY,
    category VARCHAR(50) NOT NULL REFERENCES lookup_categories(code) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lookups_cat_code ON lookups(category, code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES lookups(id),
    default_unit_id UUID NOT NULL REFERENCES units(id),
    notes TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ingredients_code ON ingredients(code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    value_type VARCHAR(20) NOT NULL,
    description_th TEXT NOT NULL,
    description_en TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    current_version_id UUID,
    created_by UUID REFERENCES users(id),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES lookups(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE IF NOT EXISTS recipe_versions (
    id UUID PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    change_note TEXT,
    input_quantity NUMERIC(15, 4),
    input_unit_id UUID REFERENCES units(id),
    expected_output_quantity NUMERIC(15, 4),
    expected_output_unit_id UUID REFERENCES units(id),
    expected_yield_pct NUMERIC(8, 2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (recipe_id, version_no)
);

ALTER TABLE recipes ADD CONSTRAINT fk_recipes_current_version
    FOREIGN KEY (current_version_id) REFERENCES recipe_versions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY,
    version_id UUID NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
    line_no INT NOT NULL,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(15, 4) NOT NULL,
    unit_id UUID NOT NULL REFERENCES units(id),
    preparation_note TEXT,
    is_optional BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS process_steps (
    id UUID PRIMARY KEY,
    version_id UUID NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
    step_no INT NOT NULL,
    round_no INT,
    step_type_id UUID NOT NULL REFERENCES process_step_types(id),
    title VARCHAR(255),
    instruction TEXT,
    temperature_c NUMERIC(6, 2),
    duration_minutes NUMERIC(8, 2),
    orientation_id UUID REFERENCES lookups(id),
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS trials (
    id UUID PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    recipe_version_id UUID NOT NULL REFERENCES recipe_versions(id),
    trial_no INT NOT NULL,
    trial_date DATE NOT NULL,
    title VARCHAR(255),
    outcome VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    input_quantity NUMERIC(15, 4),
    input_unit_id UUID REFERENCES units(id),
    output_quantity NUMERIC(15, 4),
    output_unit_id UUID REFERENCES units(id),
    actual_yield_pct NUMERIC(8, 2),
    ambient_temp_c NUMERIC(6, 2),
    humidity_pct NUMERIC(6, 2),
    weather_id UUID REFERENCES lookups(id),
    summary TEXT,
    issues TEXT,
    next_actions TEXT,
    overall_score NUMERIC(4, 2),
    created_by UUID REFERENCES users(id),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (recipe_id, trial_no)
);

CREATE TABLE IF NOT EXISTS trial_ingredients (
    id UUID PRIMARY KEY,
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    line_no INT NOT NULL,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(15, 4) NOT NULL,
    unit_id UUID NOT NULL REFERENCES units(id),
    preparation_note TEXT,
    is_optional BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS trial_steps (
    id UUID PRIMARY KEY,
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    step_no INT NOT NULL,
    round_no INT,
    step_type_id UUID NOT NULL REFERENCES process_step_types(id),
    title VARCHAR(255),
    instruction TEXT,
    temperature_c NUMERIC(6, 2),
    duration_minutes NUMERIC(8, 2),
    orientation_id UUID REFERENCES lookups(id),
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS trial_evaluations (
    id UUID PRIMARY KEY,
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    taster_name VARCHAR(255) NOT NULL,
    overall_comment TEXT,
    average_score NUMERIC(4, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trial_evaluation_scores (
    id UUID PRIMARY KEY,
    evaluation_id UUID NOT NULL REFERENCES trial_evaluations(id) ON DELETE CASCADE,
    taste_attribute_id UUID NOT NULL REFERENCES taste_attributes(id),
    score NUMERIC(4, 2) NOT NULL,
    comment TEXT,
    UNIQUE (evaluation_id, taste_attribute_id)
);

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY,
    owner_type VARCHAR(50) NOT NULL,
    owner_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    caption TEXT,
    is_cover BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    link VARCHAR(255),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(created_at) WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    request_id VARCHAR(100),
    ip VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS counters (
    name VARCHAR(100) PRIMARY KEY,
    current_val BIGINT NOT NULL DEFAULT 0
);
