"use client";

import { useState } from "react";

import type {
  PendingVerificationOrder,
  PendingVerificationComponent,
} from "@/server/verification/get-pending-orders";

import {
  calculateVerificationStatus,
  parseVerificationCount,
  type VerificationCountStatus,
} from "@/lib/verification-count";

interface VerifierTerminalProps {
  initialOrders: PendingVerificationOrder[];
}

interface SavingState {
  itemId: string | null;
  error: string | null;
}

function statusClasses(status: VerificationCountStatus): string {
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

function statusLabel(status: VerificationCountStatus): string {
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

  const [decisionOrderId, setDecisionOrderId] =
    useState<string | null>(null);

  const [rejectionOrderId, setRejectionOrderId] =
    useState<string | null>(null);

  const [rejectionNotes, setRejectionNotes] =
    useState<Record<string, string>>({});

  const [decisionError, setDecisionError] =
    useState<string | null>(null);

  const [countDrafts, setCountDrafts] =
    useState<Record<string, string>>({});

  const [countErrors, setCountErrors] =
    useState<Record<string, string | undefined>>({});

  const [rejectionNoteErrors, setRejectionNoteErrors] =
    useState<Record<string, string | undefined>>({});

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
    const parsed = parseVerificationCount(rawValue);

    if (!parsed.valid) {
      setCountErrors((current) => ({
        ...current,
        [item.id]:
          parsed.error ??
          "Enter a valid component count.",
      }));

      return;
    }

    setSaving({
      itemId: item.id,
      error: null,
    });

    try {
      const response = await fetch(
        "/api/verification/count",
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verificationItemId: item.id,
            actualQty: parsed.actualQty,
          }),
        },
      );

      const data = (await response.json()) as {
        item?: {
          actual_qty: number | null;
          status: VerificationCountStatus;
        };
        error?: string;
      };

      if (!response.ok || !data.item) {
        // Remove the unsaved draft. The input therefore
        // returns to the last server-confirmed count.
        setCountDrafts((current) => {
          const next = { ...current };
          delete next[item.id];
          return next;
        });

        setSaving({
          itemId: null,
          error:
            data.error ??
            "Unable to save component count.",
        });

        return;
      }

      updateLocalItem(item.id, {
        actualQty: data.item.actual_qty,
        status: data.item.status,
      });

      setCountDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });

      setCountErrors((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });

      setSaving({
        itemId: null,
        error: null,
      });
    } catch {
      setCountDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });

      setSaving({
        itemId: null,
        error: "Unable to connect to the server.",
      });
    }
  }

  async function submitDecision(
    orderId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    const rejectionNote =
      rejectionNotes[orderId]?.trim() ?? "";

    if (
      decision === "REJECTED" &&
      rejectionNote.length === 0
    ) {
      setRejectionNoteErrors((current) => ({
        ...current,
        [orderId]: "A rejection reason is required.",
      }));

      setDecisionError(
        "Enter a rejection reason before rejecting this batch.",
      );

      return;
    }

    setDecisionOrderId(orderId);
    setDecisionError(null);

    try {
      const response = await fetch(
        "/api/verification/decision",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            decision,
            ...(decision === "REJECTED"
              ? { rejectionNote }
              : {}),
          }),
        },
      );

      const data = (await response.json()) as {
        verification?: {
          orderId: string;
          status: string;
        };
        error?: string;
      };

      if (!response.ok || !data.verification) {
        setDecisionError(
          data.error ??
            "Unable to process verification decision.",
        );
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.filter(
          (order) => order.id !== orderId,
        ),
      );

      setRejectionOrderId(null);

      setRejectionNotes((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });

      setRejectionNoteErrors((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });

    } catch {
      setDecisionError(
        "Unable to connect to the server.",
      );
    } finally {
      setDecisionOrderId(null);
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

      {decisionError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950"
        >
          {decisionError}
        </div>
      ) : null}

      {orders.map((order) => {
        const componentViews = order.components.map(
          (component) => {
            const hasDraft = Object.prototype.hasOwnProperty.call(
              countDrafts,
              component.id,
            );

            const rawValue = hasDraft
              ? countDrafts[component.id]
              : component.actualQty === null
                ? ""
                : String(component.actualQty);

            const parsed = parseVerificationCount(rawValue);

            const previewStatus =
              parsed.valid
                ? calculateVerificationStatus(
                    parsed.actualQty,
                    component.expectedQty,
                  )
                : null;

            return {
              component,
              rawValue,
              parsed,
              previewStatus,
              hasDraft,
            };
          },
        );

        const countedComponents = componentViews.filter(
          (view) =>
            view.parsed.valid &&
            view.parsed.actualQty !== null,
        ).length;

        const redCount = componentViews.filter(
          (view) => view.previewStatus === "RED",
        ).length;

        const yellowCount = componentViews.filter(
          (view) => view.previewStatus === "YELLOW",
        ).length;

        const allCounted =
          countedComponents === order.components.length;

        const hasUnsavedCounts = componentViews.some(
          (view) => view.hasDraft,
        );

        const hasCountErrors = componentViews.some(
          (view) => Boolean(countErrors[view.component.id]),
        );

        const isSavingOrder =
          saving.itemId !== null &&
          order.components.some(
            (component) => component.id === saving.itemId,
          );

        const canApprove =
          allCounted &&
          redCount === 0 &&
          !hasUnsavedCounts &&
          !hasCountErrors &&
          !isSavingOrder;

        const isProcessingDecision =
          decisionOrderId === order.id;

        const isRejecting =
          rejectionOrderId === order.id;

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
                    {componentViews.map(
                      ({
                        component,
                        rawValue,
                        parsed,
                        previewStatus,
                      }) => (
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
                              aria-invalid={Boolean(
                                countErrors[component.id],
                              )}
                              inputMode="numeric"
                              value={rawValue}
                              onChange={(event) => {
                                const value = event.target.value;
                                const result =
                                  parseVerificationCount(value);

                                setCountDrafts((current) => ({
                                  ...current,
                                  [component.id]: value,
                                }));

                                setCountErrors((current) => ({
                                  ...current,
                                  [component.id]:
                                    result.valid
                                      ? undefined
                                      : result.error ??
                                        "Enter a valid component count.",
                                }));

                                setSaving((current) => ({
                                  ...current,
                                  error: null,
                                }));
                              }}
                              onBlur={(event) => {
                                const result =
                                  parseVerificationCount(
                                    event.target.value,
                                  );

                                if (!result.valid) {
                                  return;
                                }

                                void saveCount(
                                  component,
                                  event.target.value,
                                );
                              }}
                              className="w-32 rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                              placeholder="Count"
                            />

                            {countErrors[component.id] ? (
                              <p
                                role="alert"
                                className="mt-2 max-w-xs text-xs font-semibold text-red-800"
                              >
                                {countErrors[component.id]}
                              </p>
                            ) : null}

                            {saving.itemId === component.id ? (
                              <p className="mt-1 text-xs font-medium text-slate-600">
                                Saving...
                              </p>
                            ) : null}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses(
                                previewStatus,
                              )}`}
                            >
                              {statusLabel(previewStatus)}
                            </span>

                            {parsed.valid &&
                            Object.prototype.hasOwnProperty.call(
                              countDrafts,
                              component.id,
                            ) ? (
                              <p className="mt-1 text-xs font-medium text-slate-600">
                                Unsaved
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ),
                    )}
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

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={
                    !canApprove ||
                    isProcessingDecision
                  }
                  onClick={() =>
                    submitDecision(
                      order.id,
                      "APPROVED",
                    )
                  }
                  className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isProcessingDecision
                    ? "Processing..."
                    : "Approve Batch"}
                </button>

                <button
                  type="button"
                  disabled={isProcessingDecision}
                  onClick={() => {
                    setDecisionError(null);

                    setRejectionOrderId(
                      isRejecting ? null : order.id,
                    );
                  }}
                  className="rounded-lg border border-red-700 bg-white px-5 py-3 text-sm font-bold text-red-800 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:border-slate-400 disabled:text-slate-500"
                >
                  {isRejecting
                    ? "Cancel rejection"
                    : "Reject Batch"}
                </button>
              </div>

              {!allCounted ? (
                <p className="mt-3 text-sm text-slate-700">
                  Approve Batch is disabled until every
                  component has a physical count.
                </p>
              ) : redCount > 0 ? (
                <p className="mt-3 text-sm font-semibold text-red-800">
                  Approve Batch is disabled because a
                  shortage is present. Reject the batch
                  with a reason or correct the physical
                  count before approval.
                </p>
              ) : null}

              {isRejecting ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                  <label
                    htmlFor={`rejection-note-${order.id}`}
                    className="block text-sm font-bold text-red-950"
                  >
                    Rejection reason
                  </label>

                  <p className="mt-1 text-sm text-red-900">
                    Required. This note becomes part of
                    the permanent verification audit.
                  </p>

                  <textarea
                    id={`rejection-note-${order.id}`}
                    value={
                      rejectionNotes[order.id] ?? ""
                    }
                    onChange={(event) => {
                      const value = event.target.value;

                      setRejectionNotes((current) => ({
                        ...current,
                        [order.id]: value,
                      }));

                      setRejectionNoteErrors((current) => ({
                        ...current,
                        [order.id]: value.trim()
                          ? undefined
                          : "A rejection reason is required.",
                      }));

                      setDecisionError(null);
                    }}
                    onBlur={(event) => {
                      setRejectionNoteErrors((current) => ({
                        ...current,
                        [order.id]: event.target.value.trim()
                          ? undefined
                          : "A rejection reason is required.",
                      }));
                    }}
                    aria-invalid={Boolean(
                      rejectionNoteErrors[order.id],
                    )}
                    rows={3}
                    placeholder="Describe the shortage, defect, or reason for returning this batch to cutting."
                    className="mt-3 w-full rounded-lg border border-red-300 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-500 focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
                  />

                  {rejectionNoteErrors[order.id] ? (
                    <p
                      role="alert"
                      className="mt-2 text-sm font-semibold text-red-900"
                    >
                      {rejectionNoteErrors[order.id]}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={
                      isProcessingDecision ||
                      !(
                        rejectionNotes[
                          order.id
                        ]?.trim().length
                      )
                    }
                    onClick={() =>
                      submitDecision(
                        order.id,
                        "REJECTED",
                      )
                    }
                    className="mt-3 rounded-lg bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isProcessingDecision
                      ? "Rejecting..."
                      : "Confirm Rejection"}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
