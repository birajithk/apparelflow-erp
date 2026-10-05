"use client";

import { useState } from "react";

import type {
  PendingVerificationOrder,
  PendingVerificationComponent,
} from "@/server/verification/get-pending-orders";

interface VerifierTerminalProps {
  initialOrders: PendingVerificationOrder[];
}

type CountStatus = "GREEN" | "YELLOW" | "RED" | null;

interface SavingState {
  itemId: string | null;
  error: string | null;
}

function calculateStatus(
  actualQty: number | null,
  expectedQty: number,
): CountStatus {
  if (actualQty === null) {
    return null;
  }

  if (actualQty === expectedQty) {
    return "GREEN";
  }

  if (actualQty > expectedQty) {
    return "YELLOW";
  }

  return "RED";
}

function statusClasses(status: CountStatus): string {
  switch (status) {
    case "GREEN":
      return "border-emerald-300 bg-emerald-50 text-emerald-950";
    case "YELLOW":
      return "border-yellow-300 bg-yellow-50 text-yellow-950";
    case "RED":
      return "border-red-300 bg-red-50 text-red-950";
    default:
      return "border-slate-300 bg-slate-50 text-slate-700";
  }
}

function statusLabel(status: CountStatus): string {
  switch (status) {
    case "GREEN":
      return "GREEN — Match";
    case "YELLOW":
      return "YELLOW — Excess";
    case "RED":
      return "RED — Shortage";
    default:
      return "Not counted";
  }
}

export function VerifierTerminal({
  initialOrders,
}: VerifierTerminalProps) {
  const [orders, setOrders] =
    useState<PendingVerificationOrder[]>(initialOrders);

  const [saving, setSaving] = useState<SavingState>({
    itemId: null,
    error: null,
  });

  function updateLocalItem(
    itemId: string,
    updates: Partial<PendingVerificationComponent>,
  ) {
    setOrders((currentOrders) =>
      currentOrders.map((order) => ({
        ...order,
        components: order.components.map((component) =>
          component.id === itemId
            ? { ...component, ...updates }
            : component,
        ),
      })),
    );
  }

  async function saveCount(
    item: PendingVerificationComponent,
    rawValue: string,
  ) {
    setSaving({
      itemId: item.id,
      error: null,
    });

    let actualQty: number | null = null;

    if (rawValue !== "") {
      if (!/^\d+$/.test(rawValue)) {
        setSaving({
          itemId: null,
          error:
            "Component counts must be non-negative whole numbers.",
        });
        return;
      }

      actualQty = Number(rawValue);

      if (!Number.isSafeInteger(actualQty)) {
        setSaving({
          itemId: null,
          error: "Component count is too large.",
        });
        return;
      }
    }

    const previousActualQty = item.actualQty;
    const previousStatus = item.status;

    const previewStatus = calculateStatus(
      actualQty,
      item.expectedQty,
    );

    updateLocalItem(item.id, {
      actualQty,
      status: previewStatus,
    });

    try {
      const response = await fetch("/api/verification/count", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verificationItemId: item.id,
          actualQty,
        }),
      });

      const data = (await response.json()) as {
        item?: {
          actual_qty: number | null;
          status: CountStatus;
        };
        error?: string;
      };

      if (!response.ok || !data.item) {
        updateLocalItem(item.id, {
          actualQty: previousActualQty,
          status: previousStatus,
        });

        setSaving({
          itemId: null,
          error:
            data.error ?? "Unable to save component count.",
        });

        return;
      }

      updateLocalItem(item.id, {
        actualQty: data.item.actual_qty,
        status: data.item.status,
      });

      setSaving({
        itemId: null,
        error: null,
      });
    } catch {
      updateLocalItem(item.id, {
        actualQty: previousActualQty,
        status: previousStatus,
      });

      setSaving({
        itemId: null,
        error: "Unable to connect to the server.",
      });
    }
  }

  if (orders.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
          Verification queue
        </p>

        <h2 className="mt-2 text-2xl font-bold text-slate-950">
          No batches awaiting verification
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-700">
          Cutting batches submitted by the Cutting Supervisor
          will appear here.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {saving.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950"
        >
          {saving.error}
        </div>
      ) : null}

      {orders.map((order) => {
        const countedComponents = order.components.filter(
          (component) => component.actualQty !== null,
        ).length;

        const redCount = order.components.filter(
          (component) => component.status === "RED",
        ).length;

        const yellowCount = order.components.filter(
          (component) => component.status === "YELLOW",
        ).length;

        const allCounted =
          countedComponents === order.components.length;

        return (
          <section
            key={order.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-blue-800">
                    {order.orderNo}
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    {order.recipeName}
                  </h2>

                  <p className="mt-1 font-mono text-xs text-slate-600">
                    {order.recipeCode}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-950">
                  Pending verification
                </span>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-600">
                    Target quantity
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {order.targetQty}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-600">
                    Fabric roll
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {order.fabricRollId}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-600">
                    Actual fabric
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {order.actualFabricYards.toFixed(2)} yd
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-600">
                    Revision
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {order.revision}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Component count QC
                  </h3>

                  <p className="mt-1 text-sm text-slate-700">
                    Count every physical component before making
                    a verification decision.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-800">
                    {countedComponents}/{order.components.length} counted
                  </span>

                  {yellowCount > 0 ? (
                    <span className="rounded-full bg-yellow-100 px-3 py-1.5 text-yellow-950">
                      {yellowCount} excess
                    </span>
                  ) : null}

                  {redCount > 0 ? (
                    <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-950">
                      {redCount} shortage
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="min-w-full border-collapse text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-900">
                        Component
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        Expected
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-900">
                        Actual count
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-900">
                        QC status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {order.components.map((component) => (
                      <tr key={component.id}>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-950">
                            {component.componentName}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {component.piecesPerGarment} per garment
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right text-lg font-bold text-slate-950">
                          {component.expectedQty}
                        </td>

                        <td className="px-4 py-4">
                          <input
                            aria-label={`Actual count for ${component.componentName}`}
                            inputMode="numeric"
                            value={
                              component.actualQty === null
                                ? ""
                                : component.actualQty
                            }
                            onChange={(event) => {
                              const value = event.target.value;

                              if (
                                value !== "" &&
                                !/^\d+$/.test(value)
                              ) {
                                return;
                              }

                              const actualQty =
                                value === ""
                                  ? null
                                  : Number(value);

                              updateLocalItem(component.id, {
                                actualQty,
                                status: calculateStatus(
                                  actualQty,
                                  component.expectedQty,
                                ),
                              });
                            }}
                            onBlur={(event) =>
                              saveCount(
                                component,
                                event.target.value,
                              )
                            }
                            className="w-32 rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                            placeholder="Count"
                          />

                          {saving.itemId === component.id ? (
                            <p className="mt-1 text-xs font-medium text-slate-600">
                              Saving...
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses(
                              component.status,
                            )}`}
                          >
                            {statusLabel(component.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className={`mt-5 rounded-xl border p-4 ${
                  !allCounted
                    ? "border-slate-300 bg-slate-50"
                    : redCount > 0
                      ? "border-red-300 bg-red-50"
                      : "border-emerald-300 bg-emerald-50"
                }`}
              >
                {!allCounted ? (
                  <p className="text-sm font-semibold text-slate-800">
                    Verification incomplete — every component
                    must be counted.
                  </p>
                ) : redCount > 0 ? (
                  <p className="text-sm font-semibold text-red-950">
                    Approval blocked — this batch contains a
                    component shortage.
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-emerald-950">
                    Component counts satisfy the approval gate.
                  </p>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
