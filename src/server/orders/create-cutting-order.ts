import "server-only";

import { getDbPool } from "@/server/db/pool";

interface CreateCuttingOrderInput {
  recipeId: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYards: number;
  createdBy: string;
}

interface CreatedVerificationItem {
  component_id: string;
  component_name: string;
  pieces_per_garment: number;
  expected_qty: number;
}

export class OrderValidationError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 422,
  ) {
    super(message);
    this.name = "OrderValidationError";
  }
}

export async function createCuttingOrder(
  input: CreateCuttingOrderInput,
) {
  const db = getDbPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const recipeResult = await client.query(
      `
        SELECT
          id,
          recipe_code,
          name
        FROM recipes
        WHERE id::text = $1
        LIMIT 1
      `,
      [input.recipeId],
    );

    const recipe = recipeResult.rows[0];

    if (!recipe) {
      throw new OrderValidationError(
        "Selected recipe does not exist",
        404,
      );
    }

    const componentsResult = await client.query(
      `
        SELECT
          id,
          component_name,
          pieces_per_garment
        FROM recipe_components
        WHERE recipe_id = $1
        ORDER BY component_name
      `,
      [recipe.id],
    );

    if (componentsResult.rows.length === 0) {
      throw new OrderValidationError(
        "Selected recipe has no components",
        422,
      );
    }

    const orderResult = await client.query(
      `
        INSERT INTO cutting_orders (
          recipe_id,
          target_qty,
          fabric_roll_id,
          actual_fabric_yds,
          status,
          created_by,
          submitted_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          'PENDING_VERIFICATION',
          $5,
          NOW()
        )
        RETURNING
          id,
          order_no,
          recipe_id,
          target_qty,
          fabric_roll_id,
          actual_fabric_yds,
          status,
          created_by,
          submitted_at,
          created_at
      `,
      [
        recipe.id,
        input.targetQty,
        input.fabricRollId,
        input.actualFabricYards,
        input.createdBy,
      ],
    );

    const order = orderResult.rows[0];

    await client.query(
      `
        INSERT INTO cutting_fabric_entries (
          order_id,
          entry_type,
          fabric_yds,
          recorded_by
        )
        VALUES ($1, 'ORIGINAL', $2, $3)
      `,
      [
        order.id,
        input.actualFabricYards,
        input.createdBy,
      ],
    );

    const verificationItems: CreatedVerificationItem[] = [];

    for (const component of componentsResult.rows) {
      const expectedQty =
        input.targetQty * component.pieces_per_garment;

      const itemResult = await client.query(
        `
          INSERT INTO verification_items (
            order_id,
            component_id,
            expected_qty,
            actual_qty,
            status
          )
          VALUES ($1, $2, $3, NULL, NULL)
          RETURNING
            component_id,
            expected_qty
        `,
        [
          order.id,
          component.id,
          expectedQty,
        ],
      );

      verificationItems.push({
        component_id: itemResult.rows[0].component_id,
        component_name: component.component_name,
        pieces_per_garment: component.pieces_per_garment,
        expected_qty: itemResult.rows[0].expected_qty,
      });
    }

    await client.query("COMMIT");

    return {
      order: {
        ...order,
        recipe_code: recipe.recipe_code,
        recipe_name: recipe.name,
      },
      verification_items: verificationItems,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
