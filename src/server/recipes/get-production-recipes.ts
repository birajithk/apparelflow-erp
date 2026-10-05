import "server-only";

import { getDbPool } from "@/server/db/pool";

export interface ProductionRecipeComponent {
  id: string;
  componentName: string;
  piecesPerGarment: number;
}

export interface ProductionRecipe {
  id: string;
  recipeCode: string;
  name: string;
  category: string;
  stdFabricYards: number;
  wastageCap: number;
  components: ProductionRecipeComponent[];
}

export async function getProductionRecipes(): Promise<
  ProductionRecipe[]
> {
  const db = getDbPool();

  const result = await db.query(`
    SELECT
      r.id,
      r.recipe_code,
      r.name,
      r.category,
      r.std_fabric_yards,
      r.wastage_cap,
      rc.id AS component_id,
      rc.component_name,
      rc.pieces_per_garment
    FROM recipes r
    LEFT JOIN recipe_components rc
      ON rc.recipe_id = r.id
    ORDER BY
      r.recipe_code,
      rc.component_name
  `);

  const recipes = new Map<string, ProductionRecipe>();

  for (const row of result.rows) {
    let recipe = recipes.get(row.id);

    if (!recipe) {
      recipe = {
        id: row.id,
        recipeCode: row.recipe_code,
        name: row.name,
        category: row.category,
        stdFabricYards: Number(row.std_fabric_yards),
        wastageCap: Number(row.wastage_cap),
        components: [],
      };

      recipes.set(row.id, recipe);
    }

    if (row.component_id) {
      recipe.components.push({
        id: row.component_id,
        componentName: row.component_name,
        piecesPerGarment: row.pieces_per_garment,
      });
    }
  }

  return Array.from(recipes.values());
}
