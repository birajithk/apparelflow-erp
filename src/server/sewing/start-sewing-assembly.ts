import "server-only";

import { getDbPool } from "@/server/db/pool";

interface StartSewingInput {
  orderId: string;
  supervisorId: string;
}

export class SewingStartError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 422,
  ) {
    super(message);
    this.name = "SewingStartError";
  }
}

export async function startSewingAssembly(
  input: StartSewingInput,
) {
  const db = getDbPool();

  // One atomic database update. Both the VERIFIED state
  // and its current-revision approval audit are required.
  const result = await db.query(
    `
      UPDATE cutting_orders AS co
      SET
        status = 'IN_SEWING',
        sewing_started_by = $2,
        sewing_started_at = NOW(),
        updated_at = NOW()
      WHERE co.id::text = $1
        AND co.status = 'VERIFIED'
        AND co.verified_at IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM verification_logs vl
          WHERE vl.order_id = co.id
            AND vl.order_revision = co.revision
            AND vl.decision = 'APPROVED'
            AND (
              SELECT COUNT(*)
              FROM verification_log_items vli
              WHERE vli.verification_log_id = vl.id
            ) = (
              SELECT COUNT(*)
              FROM recipe_components rc
              WHERE rc.recipe_id = co.recipe_id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM verification_log_items vli
              WHERE vli.verification_log_id = vl.id
                AND (
                  vli.actual_qty IS NULL
                  OR vli.status IS NULL
                  OR vli.status = 'RED'
                  OR vli.actual_qty < vli.expected_qty
                )
            )
        )
      RETURNING
        id,
        order_no,
        status,
        sewing_started_at
    `,
    [input.orderId, input.supervisorId],
  );

  if (result.rows.length > 0) {
    const order = result.rows[0];

    return {
      id: order.id as string,
      orderNo: order.order_no as string,
      status: order.status as string,
      sewingStartedAt: new Date(
        order.sewing_started_at,
      ).toISOString(),
    };
  }

  const existing = await db.query(
    `
      SELECT status
      FROM cutting_orders
      WHERE id::text = $1
    `,
    [input.orderId],
  );

  if (existing.rows.length === 0) {
    throw new SewingStartError(
      "Cutting order does not exist",
      404,
    );
  }

  if (existing.rows[0].status !== "VERIFIED") {
    throw new SewingStartError(
      "Only VERIFIED batches can start sewing",
      422,
    );
  }

  throw new SewingStartError(
    "A complete, approved verification audit is required before sewing",
    422,
  );
}
