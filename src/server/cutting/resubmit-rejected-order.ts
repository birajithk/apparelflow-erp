import "server-only";

import { getDbPool } from "@/server/db/pool";

interface ResubmitRejectedOrderInput {
  orderId: string;
  additionalFabricYards: number;
  reason: string;
  supervisorId: string;
}

export class RecutError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 422,
  ) {
    super(message);
    this.name = "RecutError";
  }
}

export async function resubmitRejectedOrder(
  input: ResubmitRejectedOrderInput,
) {
  const db = getDbPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT
          id,
          order_no,
          status,
          revision,
          actual_fabric_yds
        FROM cutting_orders
        WHERE id::text = $1
        FOR UPDATE
      `,
      [input.orderId],
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new RecutError(
        "Cutting order does not exist",
        404,
      );
    }

    if (order.status !== "REJECTED") {
      throw new RecutError(
        "Only rejected batches can be submitted for re-cut verification",
        422,
      );
    }

    if (
      !Number.isFinite(input.additionalFabricYards) ||
      input.additionalFabricYards <= 0
    ) {
      throw new RecutError(
        "Additional fabric used must be greater than zero",
        422,
      );
    }

    if (!input.reason.trim()) {
      throw new RecutError(
        "A re-cut reason is required",
        422,
      );
    }

    await client.query(
      `
        INSERT INTO cutting_fabric_entries (
          order_id,
          entry_type,
          fabric_yds,
          recorded_by,
          reason
        )
        VALUES ($1, 'RECUT', $2, $3, $4)
      `,
      [
        order.id,
        input.additionalFabricYards,
        input.supervisorId,
        input.reason.trim(),
      ],
    );

    await client.query(
      `
        UPDATE verification_items
        SET
          actual_qty = NULL,
          status = NULL,
          updated_at = NOW()
        WHERE order_id = $1
      `,
      [order.id],
    );

    const updatedOrderResult = await client.query(
      `
        UPDATE cutting_orders
        SET
          actual_fabric_yds =
            actual_fabric_yds + $1,
          revision = revision + 1,
          status = 'PENDING_VERIFICATION',
          submitted_at = NOW(),
          verified_at = NULL,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id,
          order_no,
          status,
          revision,
          actual_fabric_yds,
          submitted_at
      `,
      [
        input.additionalFabricYards,
        order.id,
      ],
    );

    await client.query("COMMIT");

    const updatedOrder =
      updatedOrderResult.rows[0];

    return {
      id: updatedOrder.id,
      orderNo: updatedOrder.order_no,
      status: updatedOrder.status,
      revision: updatedOrder.revision,
      actualFabricYards: Number(
        updatedOrder.actual_fabric_yds,
      ),
      submittedAt: new Date(
        updatedOrder.submitted_at,
      ).toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
