import "server-only";

import { getDbPool } from "@/server/db/pool";

export type VerificationStatus =
  | "GREEN"
  | "YELLOW"
  | "RED";

interface UpdateVerificationCountInput {
  verificationItemId: string;
  actualQty: number | null;
}

export class VerificationCountError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 422,
  ) {
    super(message);
    this.name = "VerificationCountError";
  }
}

export async function updateVerificationCount(
  input: UpdateVerificationCountInput,
) {
  const db = getDbPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const itemResult = await client.query(
      `
        SELECT
          vi.id,
          vi.expected_qty,
          co.order_no,
          co.status AS order_status,
          rc.component_name
        FROM verification_items vi
        INNER JOIN cutting_orders co
          ON co.id = vi.order_id
        INNER JOIN recipe_components rc
          ON rc.id = vi.component_id
        WHERE vi.id::text = $1
        FOR UPDATE OF vi, co
      `,
      [input.verificationItemId],
    );

    const item = itemResult.rows[0];

    if (!item) {
      throw new VerificationCountError(
        "Verification item does not exist",
        404,
      );
    }

    if (item.order_status !== "PENDING_VERIFICATION") {
      throw new VerificationCountError(
        "Component counts can only be changed while the batch is pending verification",
        422,
      );
    }

    const expectedQty = Number(item.expected_qty);

    let status: VerificationStatus | null = null;

    if (input.actualQty !== null) {
      if (input.actualQty === expectedQty) {
        status = "GREEN";
      } else if (input.actualQty > expectedQty) {
        status = "YELLOW";
      } else {
        status = "RED";
      }
    }

    const updateResult = await client.query(
      `
        UPDATE verification_items
        SET
          actual_qty = $1,
          status = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING
          id,
          expected_qty,
          actual_qty,
          status,
          updated_at
      `,
      [
        input.actualQty,
        status,
        item.id,
      ],
    );

    await client.query("COMMIT");

    return {
      ...updateResult.rows[0],
      order_no: item.order_no,
      component_name: item.component_name,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
