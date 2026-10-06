import "server-only";

import { getDbPool } from "@/server/db/pool";

export interface SewingQueueComponent {
  componentName: string;
  expectedQty: number;
  actualQty: number;
  status: "GREEN" | "YELLOW";
  variance: number;
}

export interface SewingQueueOrder {
  id: string;
  orderNo: string;
  recipeCode: string;
  recipeName: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYards: number;
  revision: number;
  verifiedAt: string;
  verifierName: string;
  verifierEmail: string;
  wastagePct: number;
  components: SewingQueueComponent[];
}

export async function getSewingQueue(): Promise<
  SewingQueueOrder[]
> {
  const db = getDbPool();

  const result = await db.query(`
    SELECT
      co.id AS order_id,
      co.order_no,
      co.target_qty,
      co.fabric_roll_id,
      co.actual_fabric_yds,
      co.revision,
      co.verified_at,

      r.recipe_code,
      r.name AS recipe_name,

      vl.id AS verification_log_id,
      vl.wastage_pct,
      vl.decided_at,

      u.full_name AS verifier_name,
      u.email AS verifier_email,

      rc.component_name,
      vli.expected_qty,
      vli.actual_qty,
      vli.status,
      vli.variance

    FROM cutting_orders co

    INNER JOIN recipes r
      ON r.id = co.recipe_id

    INNER JOIN verification_logs vl
      ON vl.order_id = co.id
      AND vl.order_revision = co.revision
      AND vl.decision = 'APPROVED'

    INNER JOIN users u
      ON u.id = vl.verifier_id

    INNER JOIN verification_log_items vli
      ON vli.verification_log_id = vl.id

    INNER JOIN recipe_components rc
      ON rc.id = vli.component_id

    WHERE co.status = 'VERIFIED'

    ORDER BY
      co.verified_at ASC,
      co.order_no ASC,
      rc.component_name ASC
  `);

  const orders = new Map<
    string,
    SewingQueueOrder
  >();

  for (const row of result.rows) {
    let order = orders.get(row.order_id);

    if (!order) {
      order = {
        id: row.order_id,
        orderNo: row.order_no,
        recipeCode: row.recipe_code,
        recipeName: row.recipe_name,
        targetQty: row.target_qty,
        fabricRollId: row.fabric_roll_id,
        actualFabricYards: Number(
          row.actual_fabric_yds,
        ),
        revision: row.revision,
        verifiedAt: new Date(
          row.verified_at,
        ).toISOString(),
        verifierName: row.verifier_name,
        verifierEmail: row.verifier_email,
        wastagePct: Number(
          row.wastage_pct,
        ),
        components: [],
      };

      orders.set(row.order_id, order);
    }

    order.components.push({
      componentName: row.component_name,
      expectedQty: row.expected_qty,
      actualQty: row.actual_qty,
      status: row.status,
      variance: row.variance,
    });
  }

  return Array.from(orders.values());
}
