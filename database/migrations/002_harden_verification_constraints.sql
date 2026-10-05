-- ApparelFlow ERP
-- Migration 002: Harden verification count and audit snapshot constraints

-- Current verification items:
-- Either the component is completely uncounted,
-- or it has a count and an exact server-consistent traffic-light status.

ALTER TABLE verification_items
DROP CONSTRAINT count_status_consistency;

ALTER TABLE verification_items
ADD CONSTRAINT count_status_consistency
CHECK (
    (
        actual_qty IS NULL
        AND status IS NULL
    )
    OR
    (
        actual_qty IS NOT NULL
        AND status IS NOT NULL
        AND (
            (actual_qty = expected_qty AND status = 'GREEN')
            OR
            (actual_qty > expected_qty AND status = 'YELLOW')
            OR
            (actual_qty < expected_qty AND status = 'RED')
        )
    )
);

-- Immutable verification snapshots:
-- A snapshot item is either explicitly uncounted, or every derived
-- field must be present and internally consistent.

ALTER TABLE verification_log_items
DROP CONSTRAINT snapshot_consistency;

ALTER TABLE verification_log_items
ADD CONSTRAINT snapshot_consistency
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
        AND variance IS NOT NULL
        AND variance = actual_qty - expected_qty
        AND (
            (actual_qty = expected_qty AND status = 'GREEN')
            OR
            (actual_qty > expected_qty AND status = 'YELLOW')
            OR
            (actual_qty < expected_qty AND status = 'RED')
        )
    )
);