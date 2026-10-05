import "server-only";

import { getDbPool } from "@/server/db/pool";

export type VerificationDecision =
  | "APPROVED"
  | "REJECTED";

interface DecideVerificationInput {
  orderId: string;
  verifierId: string;
  decision: VerificationDecision;
  rejectionNote: string | null;
}

export class VerificationDecisionError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 422,
  ) {
    super(message);
    this.name = "VerificationDecisionError";
  }
}

export async function decideVerification(
  input: DecideVerificationInput,
) {
  const db = getDbPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT
          co.id,
          co.order_no,
          co.recipe_id,
          co.target_qty,
          co.actual_fabric_yds,
          co.status,
          co.revision,
          r.std_fabric_yards,
          ROUND(
            (
              (
                co.actual_fabric_yds
                - (co.target_qty * r.std_fabric_yards)
              )
              / NULLIF(
                  co.target_qty * r.std_fabric_yards,
                  0
                )
            ) * 100,
            6
          ) AS wastage_pct
        FROM cutting_orders co
        INNER JOIN recipes r
          ON r.id = co.recipe_id
        WHERE co.id::text = $1
        FOR UPDATE OF co
      `,
      [input.orderId],
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new VerificationDecisionError(
        "Cutting order does not exist",
        404,
      );
    }

    if (order.status !== "PENDING_VERIFICATION") {
      throw new VerificationDecisionError(
        "Only pending verification batches can be approved or rejected",
        422,
      );
    }

    const itemsResult = await client.query(
      `
        SELECT
          id,
          component_id,
          expected_qty,
          actual_qty,
          status
        FROM verification_items
        WHERE order_id = $1
        ORDER BY component_id
        FOR UPDATE
      `,
      [order.id],
    );

    const recipeComponentCountResult =
      await client.query(
        `
          SELECT COUNT(*)::integer AS component_count
          FROM recipe_components
          WHERE recipe_id = $1
        `,
        [order.recipe_id],
      );

    const expectedComponentCount =
      recipeComponentCountResult.rows[0].component_count;

    if (input.decision === "APPROVED") {
      if (
        itemsResult.rows.length === 0 ||
        itemsResult.rows.length !== expectedComponentCount
      ) {
        throw new VerificationDecisionError(
          "Approval blocked: one or more required verification components are missing",
          422,
        );
      }

      const hasUncounted = itemsResult.rows.some(
        (item) =>
          item.actual_qty === null ||
          item.status === null,
      );

      if (hasUncounted) {
        throw new VerificationDecisionError(
          "Approval blocked: every component must be counted before approval",
          422,
        );
      }

      const hasShortage = itemsResult.rows.some(
        (item) => item.status === "RED",
      );

      if (hasShortage) {
        throw new VerificationDecisionError(
          "Approval blocked: one or more components have a shortage",
          422,
        );
      }
    }

    if (
      input.decision === "REJECTED" &&
      !input.rejectionNote?.trim()
    ) {
      throw new VerificationDecisionError(
        "A rejection reason is required",
        422,
      );
    }

    const logResult = await client.query(
      `
        INSERT INTO verification_logs (
          order_id,
          verifier_id,
          order_revision,
          decision,
          rejection_note,
          wastage_pct,
          actual_fabric_yds
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        )
        RETURNING
          id,
          decision,
          rejection_note,
          wastage_pct,
          decided_at
      `,
      [
        order.id,
        input.verifierId,
        order.revision,
        input.decision,
        input.decision === "REJECTED"
          ? input.rejectionNote?.trim()
          : null,
        order.wastage_pct,
        order.actual_fabric_yds,
      ],
    );

    const verificationLog = logResult.rows[0];

    await client.query(
      `
        INSERT INTO verification_log_items (
          verification_log_id,
          component_id,
          expected_qty,
          actual_qty,
          status,
          variance
        )
        SELECT
          $1,
          component_id,
          expected_qty,
          actual_qty,
          status,
          CASE
            WHEN actual_qty IS NULL THEN NULL
            ELSE actual_qty - expected_qty
          END
        FROM verification_items
        WHERE order_id = $2
      `,
      [verificationLog.id, order.id],
    );

    const nextStatus =
      input.decision === "APPROVED"
        ? "VERIFIED"
        : "REJECTED";

    await client.query(
      `
        UPDATE cutting_orders
        SET
          status = $1,
          verified_at = CASE
            WHEN $1 = 'VERIFIED'
              THEN $2::timestamptz
            ELSE NULL
          END,
          updated_at = $2::timestamptz
        WHERE id = $3
      `,
      [
        nextStatus,
        verificationLog.decided_at,
        order.id,
      ],
    );

    await client.query("COMMIT");

    return {
      orderId: order.id,
      orderNo: order.order_no,
      decision: verificationLog.decision,
      status: nextStatus,
      rejectionNote:
        verificationLog.rejection_note,
      wastagePct: Number(
        verificationLog.wastage_pct,
      ),
      decidedAt: new Date(
        verificationLog.decided_at,
      ).toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
