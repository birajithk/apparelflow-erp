-- ApparelFlow ERP
-- Migration 004: Server-generated sequential cutting order numbers

CREATE SEQUENCE cutting_order_no_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO CYCLE;

ALTER SEQUENCE cutting_order_no_seq
OWNED BY cutting_orders.order_no;

ALTER TABLE cutting_orders
ALTER COLUMN order_no
SET DEFAULT (
    'CUT-' ||
    LPAD(
        nextval('cutting_order_no_seq')::TEXT,
        6,
        '0'
    )
);