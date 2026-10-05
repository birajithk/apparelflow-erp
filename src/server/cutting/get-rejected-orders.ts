import "server-only";

import { getDbPool } from "@/server/db/pool";

export interface RejectedCuttingOrder {
  id: string;
  orderNo: string;
  recipeCode: string;
  recipeName: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYards: number;
  revision: number;
  rejectionNote: string;
  rejectedAt: string;
  verifierName: string;
}

export async function getRejectedCuttingOrders(): Promise<
  RejectedCuttingOrder[]
> {
  const db = getDbPool();

  const result = await db.query(`
    SELECT
      co.id,
      co.order_no,
      co.target_qty,
      co.fabric_roll_id,
      co.actual_fabric_yds,
      co.revision,

      r.recipe_code,
      r.name AS recipe_name,

      vl.rejection_note,
      vl.decided_at,

      u.full_name AS verifier_name

    FROM cutting_orders co

    INNER JOIN recipes r
      ON r.id = co.recipe_id

    INNER JOIN verification_logs vl
      ON vl.order_id = co.id
      AND vl.order_revision = co.revision
      AND vl.decision = 'REJECTED'

    INNER JOIN users u
      ON u.id = vl.verifier_id

    WHERE co.status = 'REJECTED'

    ORDER BY vl.decided_at ASC, co.order_no ASC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    orderNo: row.order_no,
    recipeCode: row.recipe_code,
    recipeName: row.recipe_name,
    targetQty: row.target_qty,
    fabricRollId: row.fabric_roll_id,
    actualFabricYards: Number(row.actual_fabric_yds),
    revision: row.revision,
    rejectionNote: row.rejection_note,
    rejectedAt: new Date(row.decided_at).toISOString(),
    verifierName: row.verifier_name,
  }));
}
