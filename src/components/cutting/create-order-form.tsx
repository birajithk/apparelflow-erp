"use client";

import { FormEvent, useMemo, useState } from "react";

import type { ProductionRecipe } from "@/server/recipes/get-production-recipes";
import { normalizeFabricDifference } from "@/lib/fabric-variance";

interface CreateOrderFormProps {
  recipes: ProductionRecipe[];
}

interface FieldErrors {
  recipeId?: string;
  targetQty?: string;
  fabricRollId?: string;
  actualFabricYards?: string;
  form?: string;
}

interface CreatedOrderResponse {
  order: {
    order_no: string;
    status: string;
    target_qty: number;
    fabric_roll_id: string;
    actual_fabric_yds: string;
    recipe_code: string;
    recipe_name: string;
  };
}

function parsePositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePositiveDecimal(value: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function CreateOrderForm({
  recipes,
}: CreateOrderFormProps) {
  const [recipeId, setRecipeId] = useState("");
  const [targetQty, setTargetQty] = useState("");
  const [fabricRollId, setFabricRollId] = useState("");
  const [actualFabricYards, setActualFabricYards] =
    useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] =
    useState<CreatedOrderResponse["order"] | null>(null);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === recipeId),
    [recipeId, recipes],
  );

  const validTargetQty = parsePositiveInteger(targetQty);

  const expectedFabric =
    selectedRecipe && validTargetQty
      ? selectedRecipe.stdFabricYards * validTargetQty
      : null;

  const parsedActualFabricYards =
    parsePositiveDecimal(actualFabricYards);

  const fabricDifference =
    expectedFabric !== null &&
    parsedActualFabricYards !== null
      ? normalizeFabricDifference(
          parsedActualFabricYards,
          expectedFabric,
        )
      : null;

  const fabricVariancePct =
    expectedFabric !== null &&
    fabricDifference !== null
      ? (fabricDifference / expectedFabric) * 100
      : null;

  const exceedsWastageCap =
    selectedRecipe !== undefined &&
    fabricVariancePct !== null &&
    fabricVariancePct > selectedRecipe.wastageCap;

  function validate(): {
    targetQty: number;
    actualFabricYards: number;
  } | null {
    const nextErrors: FieldErrors = {};

    if (!recipeId) {
      nextErrors.recipeId = "Select a production recipe.";
    }

    const parsedTargetQty = parsePositiveInteger(targetQty);

    if (parsedTargetQty === null) {
      nextErrors.targetQty =
        "Target quantity must be a positive whole number.";
    }

    if (!fabricRollId.trim()) {
      nextErrors.fabricRollId = "Fabric roll ID is required.";
    }

    const parsedFabricYards =
      parsePositiveDecimal(actualFabricYards);

    if (parsedFabricYards === null) {
      nextErrors.actualFabricYards =
        "Actual fabric used must be a positive number.";
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      parsedTargetQty === null ||
      parsedFabricYards === null
    ) {
      return null;
    }

    return {
      targetQty: parsedTargetQty,
      actualFabricYards: parsedFabricYards,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setCreatedOrder(null);

    const parsed = validate();

    if (!parsed) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/api/cutting/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId,
          targetQty: parsed.targetQty,
          fabricRollId: fabricRollId.trim(),
          actualFabricYards: parsed.actualFabricYards,
        }),
      });

      const data = (await response.json()) as
        | CreatedOrderResponse
        | { error?: string };

      if (!response.ok) {
        setErrors({
          form:
            "error" in data && data.error
              ? data.error
              : "Unable to create cutting order.",
        });

        return;
      }

      const success = data as CreatedOrderResponse;

      setCreatedOrder(success.order);

      setRecipeId("");
      setTargetQty("");
      setFabricRollId("");
      setActualFabricYards("");
    } catch {
      setErrors({
        form: "Unable to connect to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
          Cutting order
        </p>

        <h2 className="mt-2 text-2xl font-bold text-slate-950">
          Create production batch
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          Submit a completed cutting batch to the verification
          checkpoint.
        </p>

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <label
              htmlFor="recipe"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              Production recipe
            </label>

            <select
              id="recipe"
              value={recipeId}
              onChange={(event) => {
                const value = event.target.value;

                setRecipeId(value);

                setErrors((current) => ({
                  ...current,
                  recipeId: value
                    ? undefined
                    : "Select a production recipe.",
                  form: undefined,
                }));
              }}
              onBlur={() => {
                if (!recipeId) {
                  setErrors((current) => ({
                    ...current,
                    recipeId: "Select a production recipe.",
                  }));
                }
              }}
              className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              <option value="">Select a recipe</option>

              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.recipeCode} — {recipe.name}
                </option>
              ))}
            </select>

            {errors.recipeId ? (
              <p className="mt-2 text-sm font-medium text-red-800">
                {errors.recipeId}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="targetQty"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              Target batch quantity
            </label>

            <input
              id="targetQty"
              inputMode="numeric"
              value={targetQty}
              onChange={(event) => {
                const value = event.target.value;

                setTargetQty(value);

                setErrors((current) => ({
                  ...current,
                  targetQty:
                    parsePositiveInteger(value) === null
                      ? "Target quantity must be a positive whole number."
                      : undefined,
                  form: undefined,
                }));
              }}
              onBlur={() => {
                if (parsePositiveInteger(targetQty) === null) {
                  setErrors((current) => ({
                    ...current,
                    targetQty:
                      "Target quantity must be a positive whole number.",
                  }));
                }
              }}
              placeholder="Enter number of garments"
              className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            />

            {errors.targetQty ? (
              <p className="mt-2 text-sm font-medium text-red-800">
                {errors.targetQty}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="fabricRollId"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              Fabric roll ID
            </label>

            <input
              id="fabricRollId"
              value={fabricRollId}
              onChange={(event) => {
                const value = event.target.value;

                setFabricRollId(value);

                setErrors((current) => ({
                  ...current,
                  fabricRollId: value.trim()
                    ? undefined
                    : "Fabric roll ID is required.",
                  form: undefined,
                }));
              }}
              onBlur={() => {
                if (!fabricRollId.trim()) {
                  setErrors((current) => ({
                    ...current,
                    fabricRollId: "Fabric roll ID is required.",
                  }));
                }
              }}
              placeholder="e.g. FAB-ROLL-882"
              className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            />

            {errors.fabricRollId ? (
              <p className="mt-2 text-sm font-medium text-red-800">
                {errors.fabricRollId}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="actualFabricYards"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              Actual fabric used (yards)
            </label>

            <input
              id="actualFabricYards"
              inputMode="decimal"
              value={actualFabricYards}
              onChange={(event) => {
                const value = event.target.value;

                setActualFabricYards(value);

                setErrors((current) => ({
                  ...current,
                  actualFabricYards:
                    parsePositiveDecimal(value) === null
                      ? "Actual fabric used must be a positive number."
                      : undefined,
                  form: undefined,
                }));
              }}
              onBlur={() => {
                if (
                  parsePositiveDecimal(actualFabricYards) === null
                ) {
                  setErrors((current) => ({
                    ...current,
                    actualFabricYards:
                      "Actual fabric used must be a positive number.",
                  }));
                }
              }}
              placeholder="Enter total fabric used"
              className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            />

            {errors.actualFabricYards ? (
              <p className="mt-2 text-sm font-medium text-red-800">
                {errors.actualFabricYards}
              </p>
            ) : null}
          </div>

          {errors.form ? (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
            >
              {errors.form}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isSubmitting
              ? "Submitting batch..."
              : "Submit for verification"}
          </button>
        </form>

        {createdOrder ? (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4"
          >
            <p className="font-semibold text-emerald-950">
              Batch submitted successfully
            </p>

            <p className="mt-2 text-sm text-emerald-900">
              Order{" "}
              <span className="font-mono font-bold">
                {createdOrder.order_no}
              </span>{" "}
              is now pending verification.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
          Multiplier engine
        </p>

        <h2 className="mt-2 text-2xl font-bold text-slate-950">
          Expected component counts
        </h2>

        {!selectedRecipe ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-sm text-slate-700">
              Select a recipe to view its production components.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase text-slate-600">
                  Recipe
                </p>

                <p className="mt-1 font-semibold text-slate-950">
                  {selectedRecipe.name}
                </p>

                <p className="mt-1 font-mono text-xs text-slate-700">
                  {selectedRecipe.recipeCode}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase text-slate-600">
                  Standard fabric
                </p>

                <p className="mt-1 font-semibold text-slate-950">
                  {selectedRecipe.stdFabricYards} yds / piece
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase text-slate-600">
                  Wastage cap
                </p>

                <p className="mt-1 font-semibold text-slate-950">
                  {selectedRecipe.wastageCap}%
                </p>
              </div>
            </div>

            {expectedFabric !== null ? (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-950">
                  Expected fabric for{" "}
                  <strong>{validTargetQty}</strong> garments:{" "}
                  <strong>{expectedFabric.toFixed(2)} yards</strong>
                </p>
              </div>
            ) : null}

            {expectedFabric !== null &&
            parsedActualFabricYards !== null &&
            fabricDifference !== null &&
            fabricVariancePct !== null ? (
              <div
                className={`mt-4 rounded-xl border p-4 ${
                  exceedsWastageCap
                    ? "border-red-300 bg-red-50"
                    : fabricVariancePct < 0
                      ? "border-yellow-300 bg-yellow-50"
                      : "border-emerald-300 bg-emerald-50"
                }`}
              >
                <p className="font-semibold text-slate-950">
                  Fabric usage comparison
                </p>

                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-slate-600">Expected</dt>
                    <dd className="font-semibold text-slate-950">
                      {expectedFabric.toFixed(2)} yd
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-600">Actual</dt>
                    <dd className="font-semibold text-slate-950">
                      {parsedActualFabricYards.toFixed(2)} yd
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-600">Variance</dt>
                    <dd className="font-semibold text-slate-950">
                      {fabricVariancePct > 0 ? "+" : ""}
                      {fabricVariancePct.toFixed(2)}%
                    </dd>
                  </div>
                </dl>

                {exceedsWastageCap ? (
                  <p className="mt-3 text-sm font-semibold text-red-950">
                    Warning: fabric usage exceeds this recipe&apos;s{" "}
                    {selectedRecipe.wastageCap}% wastage cap.
                  </p>
                ) : fabricVariancePct < 0 ? (
                  <p className="mt-3 text-sm font-semibold text-yellow-950">
                    Actual usage is{" "}
                    {Math.abs(fabricDifference).toFixed(2)} yards below
                    the recipe standard. Component verification still
                    determines whether the batch may pass.
                  </p>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-emerald-950">
                    Fabric usage is within the configured wastage cap.
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-900">
                      Component
                    </th>

                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      Per garment
                    </th>

                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      Expected
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {selectedRecipe.components.map((component) => (
                    <tr key={component.id}>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {component.componentName}
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {component.piecesPerGarment}
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-950">
                        {validTargetQty
                          ? validTargetQty *
                            component.piecesPerGarment
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
