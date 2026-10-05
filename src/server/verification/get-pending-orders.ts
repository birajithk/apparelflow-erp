import "server-only";

import { getDbPool } from "@/server/db/pool";

export interface PendingVerificationComponent {
  id: string;
  componentName: string;
  piecesPerGarment: number;
  expectedQty: number;
  actualQty: number | null;
  status: "GREEN" | "YELLOW" | "RED" | null;
}

export interface PendingVerificationOrder {
  id: string;
  orderNo: string;
  recipeCode: string;
  recipeName: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYards: number;
  revision: number;
  submittedAt: string | null;
  components: PendingVerificationComponent[];
}

export async function getPendingVerificationOrders(): Promise<
  PendingVerificationOrder[]
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
      co.submitted_at,

      r.recipe_code,
      r.name AS recipe_name,

      vi.id AS verification_item_id,
      vi.expected_qty,
      vi.actual_qty,
      vi.status,

      rc.component_name,
      rc.pieces_per_garment

    FROM cutting_orders co

    INNER JOIN recipes r
      ON r.id = co.recipe_id

    INNER JOIN verification_items vi
      ON vi.order_id = co.id

    INNER JOIN recipe_components rc
      ON rc.id = vi.component_id

    WHERE co.status = 'PENDING_VERIFICATION'

    ORDER BY
      co.submitted_at ASC,
      co.order_no ASC,
      rc.component_name ASC
  `);

  const orders = new Map<string, PendingVerificationOrder>();

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
        actualFabricYards: Number(row.actual_fabric_yds),
        revision: row.revision,
        submittedAt: row.submitted_at
          ? new Date(row.submitted_at).toISOString()
          : null,
        components: [],
      };

      orders.set(row.order_id, order);
    }

    order.components.push({
      id: row.verification_item_id,
      componentName: row.component_name,
      piecesPerGarment: row.pieces_per_garment,
      expectedQty: row.expected_qty,
      actualQty: row.actual_qty,
      status: row.status,
    });
  }

  return Array.from(orders.values());
}
