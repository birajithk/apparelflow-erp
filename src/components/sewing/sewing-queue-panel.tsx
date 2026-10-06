"use client";

import { useState } from "react";

import type {
  SewingQueueOrder,
} from "@/server/sewing/get-sewing-queue";

interface SewingQueuePanelProps {
  initialOrders: SewingQueueOrder[];
}

export function SewingQueuePanel({
  initialOrders,
}: SewingQueuePanelProps) {
  const [orders, setOrders] =
    useState<SewingQueueOrder[]>(initialOrders);

  const [startingOrderId, setStartingOrderId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  async function handleStart(order: SewingQueueOrder) {
    if (startingOrderId !== null) {
      return;
    }

    setStartingOrderId(order.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/sewing/start",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: order.id,
          }),
        },
      );

      const data = (await response.json()) as {
        order?: {
          id: string;
          orderNo: string;
          status: string;
          sewingStartedAt: string;
        };
        error?: string;
      };

      if (
        !response.ok ||
        data.order?.status !== "IN_SEWING"
      ) {
        setError(
          data.error ??
            "Unable to start sewing assembly.",
        );
        return;
      }

      setOrders((current) =>
        current.filter(
          (item) => item.id !== order.id,
        ),
      );

      setSuccess(
        `${order.orderNo} has started sewing assembly successfully.`,
      );
    } catch {
      setError(
        "Unable to connect to the server.",
      );
    } finally {
      setStartingOrderId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
        Verified production batches
      </p>

      <h2 className="mt-2 text-2xl font-bold text-slate-950">
        Sewing Queue
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-700">
        Only batches approved by an authorized Cutting
        Verifier are released for sewing assembly.
        Review the verification audit before starting.
      </p>

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950"
        >
          {success}
        </div>
      ) : null}

      {orders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <p className="font-semibold text-slate-900">
            No verified batches are waiting for sewing.
          </p>

          <p className="mt-2 text-sm text-slate-700">
            Approved batches will appear here after
            the Cutting Verifier signs off.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {orders.map((order) => {
            const isStarting =
              startingOrderId === order.id;

            return (
              <article
                key={order.id}
                className="rounded-xl border border-slate-300 bg-slate-50 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-sm font-bold text-blue-800">
                      {order.orderNo}
                    </p>

                    <h3 className="mt-1 text-xl font-bold text-slate-950">
                      {order.recipeName}
                    </h3>

                    <p className="mt-1 font-mono text-xs text-slate-600">
                      {order.recipeCode}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-950">
                    VERIFIED · Revision {order.revision}
                  </span>
                </div>

                <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-600">
                      Target garments
                    </dt>
                    <dd className="mt-1 font-bold text-slate-950">
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
                      Actual fabric used
                    </dt>
                    <dd className="mt-1 font-bold text-slate-950">
                      {order.actualFabricYards.toFixed(2)} yd
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-600">
                      Fabric wastage
                    </dt>
                    <dd className="mt-1 font-bold text-slate-950">
                      {order.wastagePct.toFixed(2)}%
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 rounded-xl border border-emerald-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Verification audit
                  </p>

                  <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold text-slate-600">
                        Authorized verifier
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-950">
                        {order.verifierName}
                      </dd>

                      <dd className="mt-1 break-all text-xs text-slate-700">
                        {order.verifierEmail}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold text-slate-600">
                        Verified at
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-950">
                        {new Date(
                          order.verifiedAt,
                        ).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6">
                  <h4 className="text-base font-bold text-slate-950">
                    Verified component counts
                  </h4>

                  <p className="mt-1 text-sm text-slate-700">
                    Permanent count snapshot recorded
                    at verification sign-off.
                  </p>

                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-300 bg-white">
                    <table className="w-full min-w-[580px] text-left text-sm">
                      <thead className="bg-slate-200 text-slate-950">
                        <tr>
                          <th
                            scope="col"
                            className="px-4 py-3 font-bold"
                          >
                            Component
                          </th>

                          <th
                            scope="col"
                            className="px-4 py-3 font-bold"
                          >
                            Expected
                          </th>

                          <th
                            scope="col"
                            className="px-4 py-3 font-bold"
                          >
                            Actual
                          </th>

                          <th
                            scope="col"
                            className="px-4 py-3 font-bold"
                          >
                            Variance
                          </th>

                          <th
                            scope="col"
                            className="px-4 py-3 font-bold"
                          >
                            QC
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {order.components.map(
                          (component) => (
                            <tr
                              key={component.componentName}
                              className="border-t border-slate-200 text-slate-900"
                            >
                              <td className="px-4 py-3 font-semibold">
                                {component.componentName}
                              </td>

                              <td className="px-4 py-3">
                                {component.expectedQty}
                              </td>

                              <td className="px-4 py-3">
                                {component.actualQty}
                              </td>

                              <td className="px-4 py-3">
                                {component.variance > 0
                                  ? "+"
                                  : ""}
                                {component.variance}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={
                                    component.status ===
                                    "GREEN"
                                      ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-950"
                                      : "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950"
                                  }
                                >
                                  {component.status}
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-300 pt-5">
                  <button
                    type="button"
                    disabled={startingOrderId !== null}
                    onClick={() => handleStart(order)}
                    className="rounded-lg bg-blue-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isStarting
                      ? "Starting assembly..."
                      : "Start Sewing Assembly"}
                  </button>

                  <p className="mt-3 text-sm text-slate-700">
                    Starting assembly moves this batch
                    from VERIFIED to IN_SEWING and
                    removes it from the waiting queue.
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
