
-- ApparelFlow ERP
-- Migration 001: Initial relational schema

-- 1. USERS

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (
        role IN (
            'cutting_supervisor',
            'cutting_verifier',
            'sewing_supervisor'
        )
    ),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_not_empty
        CHECK (LENGTH(TRIM(email)) > 0),

    CONSTRAINT users_name_not_empty
        CHECK (LENGTH(TRIM(full_name)) > 0)
);

CREATE UNIQUE INDEX users_email_lower_unique
ON users (LOWER(email));


-- 2. SESSIONS

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_user_id_idx
ON sessions(user_id);

CREATE INDEX sessions_expires_at_idx
ON sessions(expires_at);


-- 3. RECIPES

CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,

    std_fabric_yards NUMERIC(12,3) NOT NULL
        CHECK (std_fabric_yards > 0),

    wastage_cap NUMERIC(7,3) NOT NULL
        CHECK (wastage_cap >= 0),

    CONSTRAINT recipes_code_not_empty
        CHECK (LENGTH(TRIM(recipe_code)) > 0),

    CONSTRAINT recipes_name_not_empty
        CHECK (LENGTH(TRIM(name)) > 0),

    CONSTRAINT recipes_category_not_empty
        CHECK (LENGTH(TRIM(category)) > 0)
);


-- 4. RECIPE COMPONENTS

CREATE TABLE recipe_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    recipe_id UUID NOT NULL
        REFERENCES recipes(id),

    component_name TEXT NOT NULL,

    pieces_per_garment INTEGER NOT NULL
        CHECK (pieces_per_garment > 0),

    image_url TEXT,

    UNIQUE (recipe_id, component_name),

    CONSTRAINT component_name_not_empty
        CHECK (LENGTH(TRIM(component_name)) > 0)
);

CREATE INDEX recipe_components_recipe_idx
ON recipe_components(recipe_id);


-- 5. CUTTING ORDERS

CREATE TABLE cutting_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_no TEXT NOT NULL UNIQUE,

    recipe_id UUID NOT NULL
        REFERENCES recipes(id),

    target_qty INTEGER NOT NULL
        CHECK (target_qty > 0),

    fabric_roll_id TEXT NOT NULL,

    actual_fabric_yds NUMERIC(14,3) NOT NULL
        DEFAULT 0
        CHECK (actual_fabric_yds >= 0),

    status TEXT NOT NULL
        DEFAULT 'CUTTING_IN_PROGRESS'
        CHECK (
            status IN (
                'CUTTING_IN_PROGRESS',
                'PENDING_VERIFICATION',
                'REJECTED',
                'VERIFIED',
                'IN_SEWING'
            )
        ),

    created_by UUID NOT NULL
        REFERENCES users(id),

    revision INTEGER NOT NULL
        DEFAULT 1
        CHECK (revision > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    sewing_started_at TIMESTAMPTZ,

    sewing_started_by UUID
        REFERENCES users(id),

    CONSTRAINT order_no_not_empty
        CHECK (LENGTH(TRIM(order_no)) > 0),

    CONSTRAINT fabric_roll_not_empty
        CHECK (LENGTH(TRIM(fabric_roll_id)) > 0)
);

CREATE INDEX cutting_orders_status_idx
ON cutting_orders(status);

CREATE INDEX cutting_orders_recipe_idx
ON cutting_orders(recipe_id);

CREATE INDEX cutting_orders_creator_idx
ON cutting_orders(created_by);


-- 6. CUTTING FABRIC ENTRIES

CREATE TABLE cutting_fabric_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES cutting_orders(id),

    entry_type TEXT NOT NULL
        CHECK (entry_type IN ('ORIGINAL', 'RECUT')),

    fabric_yds NUMERIC(14,3) NOT NULL
        CHECK (fabric_yds > 0),

    recorded_by UUID NOT NULL
        REFERENCES users(id),

    reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT recut_reason_required
        CHECK (
            entry_type = 'ORIGINAL'
            OR (
                reason IS NOT NULL
                AND LENGTH(TRIM(reason)) > 0
            )
        )
);

CREATE UNIQUE INDEX one_original_fabric_entry_per_order
ON cutting_fabric_entries(order_id)
WHERE entry_type = 'ORIGINAL';

CREATE INDEX fabric_entries_order_idx
ON cutting_fabric_entries(order_id);


-- 7. VERIFICATION ITEMS

CREATE TABLE verification_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES cutting_orders(id),

    component_id UUID NOT NULL
        REFERENCES recipe_components(id),

    expected_qty INTEGER NOT NULL
        CHECK (expected_qty > 0),

    actual_qty INTEGER
        CHECK (actual_qty >= 0),

    status TEXT CHECK (
        status IN ('GREEN', 'YELLOW', 'RED')
    ),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (order_id, component_id),

    CONSTRAINT count_status_consistency
        CHECK (
            (
                actual_qty IS NULL
                AND status IS NULL
            )
            OR
            (
                actual_qty IS NOT NULL
                AND status IS NOT NULL
                AND status = CASE
                    WHEN actual_qty = expected_qty
                        THEN 'GREEN'
                    WHEN actual_qty > expected_qty
                        THEN 'YELLOW'
                    ELSE 'RED'
                END
            )
        )
);

CREATE INDEX verification_items_order_idx
ON verification_items(order_id);


-- 8. VERIFICATION LOGS

CREATE TABLE verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES cutting_orders(id),

    verifier_id UUID NOT NULL
        REFERENCES users(id),

    order_revision INTEGER NOT NULL
        CHECK (order_revision > 0),

    decision TEXT NOT NULL
        CHECK (
            decision IN ('APPROVED', 'REJECTED')
        ),

    rejection_note TEXT,

    wastage_pct NUMERIC(10,4) NOT NULL,

    actual_fabric_yds NUMERIC(14,3) NOT NULL
        CHECK (actual_fabric_yds > 0),

    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (order_id, order_revision),

    CONSTRAINT rejection_reason_required
        CHECK (
            (
                decision = 'APPROVED'
                AND rejection_note IS NULL
            )
            OR
            (
                decision = 'REJECTED'
                AND rejection_note IS NOT NULL
                AND LENGTH(TRIM(rejection_note)) > 0
            )
        )
);

CREATE INDEX verification_logs_order_idx
ON verification_logs(order_id);

CREATE INDEX verification_logs_verifier_idx
ON verification_logs(verifier_id);


-- 9. VERIFICATION LOG ITEMS

CREATE TABLE verification_log_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    verification_log_id UUID NOT NULL
        REFERENCES verification_logs(id),

    component_id UUID NOT NULL
        REFERENCES recipe_components(id),

    expected_qty INTEGER NOT NULL
        CHECK (expected_qty > 0),

    actual_qty INTEGER
        CHECK (actual_qty >= 0),

    status TEXT CHECK (
        status IN ('GREEN', 'YELLOW', 'RED')
    ),

    variance INTEGER,

    UNIQUE (verification_log_id, component_id),

    CONSTRAINT snapshot_consistency
        CHECK (
            (
                actual_qty IS NULL
                AND status IS NULL
                AND variance IS NULL
            )
            OR
            (
                actual_qty IS NOT NULL
                AND status IS NOT NULL
                AND variance = actual_qty - expected_qty
                AND status = CASE
                    WHEN actual_qty = expected_qty
                        THEN 'GREEN'
                    WHEN actual_qty > expected_qty
                        THEN 'YELLOW'
                    ELSE 'RED'
                END
            )
        )
);

CREATE INDEX verification_log_items_log_idx
ON verification_log_items(verification_log_id);


-- 10. IMMUTABLE AUDIT PROTECTION

CREATE FUNCTION prevent_immutable_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Updates and deletes are prohibited on %',
        TG_TABLE_NAME
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER protect_verification_logs
BEFORE UPDATE OR DELETE ON verification_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_changes();

CREATE TRIGGER protect_verification_log_items
BEFORE UPDATE OR DELETE ON verification_log_items
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_changes();

CREATE TRIGGER protect_fabric_entries
BEFORE UPDATE OR DELETE ON cutting_fabric_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_changes();
