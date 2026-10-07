"use client";

import { useState } from "react";

import type { RejectedCuttingOrder } from "@/server/cutting/get-rejected-orders";

interface RejectedBatchesPanelProps {
  initialOrders: RejectedCuttingOrder[];
}

interface RecutDraft {
  additionalFabricYards: string;
  reason: string;
}

interface FieldErrors {
  additionalFabricYards?: string;
  reason?: string;
  form?: string;
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

export function RejectedBatchesPanel({
  initialOrders,
}: RejectedBatchesPanelProps) {
  const [orders, setOrders] =
    useState<RejectedCuttingOrder[]>(initialOrders);

  const [openOrderId, setOpenOrderId] =
    useState<string | null>(null);

  const [drafts, setDrafts] =
    useState<Record<string, RecutDraft>>({});

  const [errors, setErrors] =
    useState<Record<string, FieldErrors>>({});

  const [submittingOrderId, setSubmittingOrderId] =
    useState<string | null>(null);

  function getDraft(orderId: string): RecutDraft {
    return (
      drafts[orderId] ?? {
        additionalFabricYards: "",
        reason: "",
      }
    );
  }

  function updateDraft(
    orderId: string,
    updates: Partial<RecutDraft>,
  ) {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...getDraft(orderId),
        ...updates,
      },
    }));
  }

  function updateErrors(
    orderId: string,
    updates: Partial<FieldErrors>,
  ) {
    setErrors((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? {}),
        ...updates,
      },
    }));
  }

  async function handleSubmit(orderId: string) {
    const draft = getDraft(orderId);
    const nextErrors: FieldErrors = {};

    const additionalFabricYards =
      parsePositiveDecimal(
        draft.additionalFabricYards.trim(),
      );

    if (additionalFabricYards === null) {
      nextErrors.additionalFabricYards =
        "Enter a positive fabric quantity in yards.";
    }

    if (!draft.reason.trim()) {
      nextErrors.reason =
        "A re-cut reason is required.";
    }

    setErrors((current) => ({
      ...current,
      [orderId]: nextErrors,
    }));

    if (
      additionalFabricYards === null ||
      !draft.reason.trim()
    ) {
      return;
    }

    setSubmittingOrderId(orderId);

    try {
      const response = await fetch(
        "/api/cutting/recut",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            additionalFabricYards,
            reason: draft.reason.trim(),
          }),
        },
      );

      const data = (await response.json()) as {
        order?: {
          id: string;
          status: string;
          revision: number;
        };
        error?: string;
      };

      if (!response.ok || !data.order) {
        updateErrors(orderId, {
          form:
            data.error ??
            "Unable to submit re-cut batch.",
        });

        return;
      }

      setOrders((current) =>
        current.filter(
          (order) => order.id !== orderId,
        ),
      );

      setOpenOrderId(null);

      setDrafts((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });

      setErrors((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
    } catch {
      updateErrors(orderId, {
        form: "Unable to connect to the server.",
      });
    } finally {
      setSubmittingOrderId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
        Rejected batches
      </p>

      <h2 className="mt-2 text-2xl font-bold text-slate-950">
        Re-cut queue
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-700">
        Batches rejected by the Cutting Verifier return here
        for corrective cutting work and a fresh verification
        revision.
      </p>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-700">
            No rejected batches are waiting for re-cut work.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => {
            const isOpen =
              openOrderId === order.id;

            const draft = getDraft(order.id);
            const orderErrors =
              errors[order.id] ?? {};

            const isSubmitting =
              submittingOrderId === order.id;

            return (
              <article
                key={order.id}
                className="rounded-xl border border-red-200 bg-red-50/40 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-mono text-sm font-bold text-red-800">
                      {order.orderNo}
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-slate-950">
                      {order.recipeName}
                    </h3>

                    <p className="mt-1 font-mono text-xs text-slate-600">
                      {order.recipeCode}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-950">
                    Rejected · Revision {order.revision}
                  </span>
                </div>

                <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-600">
                      Target
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
                      Fabric used so far
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-950">
                      {order.actualFabricYards.toFixed(2)} yd
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-600">
                      Rejected by
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-950">
                      {order.verifierName}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 rounded-lg border border-red-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-800">
                    Verifier rejection reason
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-900">
                    {order.rejectionNote}
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    Rejected{" "}
                    {new Date(
                      order.rejectedAt,
                    ).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOpenOrderId(
                      isOpen ? null : order.id,
                    );

                    updateErrors(order.id, {
                      form: undefined,
                    });
                  }}
                  className="mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
                >
                  {isOpen
                    ? "Cancel re-cut"
                    : "Record re-cut"}
                </button>

                {isOpen ? (
                  <div className="mt-5 rounded-xl border border-slate-300 bg-white p-5">
                    <h4 className="font-bold text-slate-950">
                      Corrective re-cut
                    </h4>

                    <p className="mt-1 text-sm text-slate-700">
                      Record only the additional fabric consumed
                      for this re-cut. Existing fabric history is
                      preserved.
                    </p>

                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`recut-fabric-${order.id}`}
                          className="mb-2 block text-sm font-semibold text-slate-900"
                        >
                          Additional fabric used (yards)
                        </label>

                        <input
                          id={`recut-fabric-${order.id}`}
                          inputMode="decimal"
                          value={
                            draft.additionalFabricYards
                          }
                          onChange={(event) => {
                            const value = event.target.value;

                            updateDraft(order.id, {
                              additionalFabricYards: value,
                            });

                            updateErrors(order.id, {
                              additionalFabricYards:
                                parsePositiveDecimal(value.trim()) === null
                                  ? "Enter a positive fabric quantity in yards."
                                  : undefined,
                              form: undefined,
                            });
                          }}
                          onBlur={(event) => {
                            const value = event.target.value;

                            updateErrors(order.id, {
                              additionalFabricYards:
                                parsePositiveDecimal(value.trim()) === null
                                  ? "Enter a positive fabric quantity in yards."
                                  : undefined,
                            });
                          }}
                          aria-invalid={Boolean(
                            orderErrors.additionalFabricYards,
                          )}
                          placeholder="Enter additional fabric used"
                          className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                        />

                        {orderErrors.additionalFabricYards ? (
                          <p
                            role="alert"
                            className="mt-2 text-sm font-medium text-red-800">
                            {
                              orderErrors.additionalFabricYards
                            }
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label
                          htmlFor={`recut-reason-${order.id}`}
                          className="mb-2 block text-sm font-semibold text-slate-900"
                        >
                          Re-cut reason
                        </label>

                        <textarea
                          id={`recut-reason-${order.id}`}
                          rows={3}
                          value={draft.reason}
                          onChange={(event) => {
                            const value = event.target.value;

                            updateDraft(order.id, {
                              reason: value,
                            });

                            updateErrors(order.id, {
                              reason: value.trim()
                                ? undefined
                                : "A re-cut reason is required.",
                              form: undefined,
                            });
                          }}
                          onBlur={(event) => {
                            updateErrors(order.id, {
                              reason: event.target.value.trim()
                                ? undefined
                                : "A re-cut reason is required.",
                            });
                          }}
                          aria-invalid={Boolean(orderErrors.reason)}
                          placeholder="Describe the corrective cutting work performed"
                          className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                        />

                        {orderErrors.reason ? (
                          <p
                            role="alert"className="mt-2 text-sm font-medium text-red-800">
                            {orderErrors.reason}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {orderErrors.form ? (
                      <div
                        role="alert"
                        className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950"
                      >
                        {orderErrors.form}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        handleSubmit(order.id)
                      }
                      className="mt-5 rounded-lg bg-blue-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isSubmitting
                        ? "Submitting re-cut..."
                        : "Submit re-cut for verification"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
