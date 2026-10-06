"use client";

import { useRef, useState } from "react";

import { CreateOrderForm } from "@/components/cutting/create-order-form";
import type { ProductionRecipe } from "@/server/recipes/get-production-recipes";

interface CreateOrderDialogProps {
  recipes: ProductionRecipe[];
}

export function CreateOrderDialog({
  recipes,
}: CreateOrderDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);

  function openDialog() {
    // Each new opening starts with a fresh form.
    setFormKey((current) => current + 1);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
              Cutting operations
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Production batch creation
            </h2>

            <p className="mt-2 text-sm text-slate-700">
              Create a cutting batch from a production recipe
              and submit it for independent verification.
            </p>
          </div>

          <button
            type="button"
            onClick={openDialog}
            className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
          >
            Create production batch
          </button>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        aria-label="Create production batch"
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto rounded-2xl border border-slate-300 bg-slate-100 p-4 text-slate-950 shadow-2xl backdrop:bg-slate-950/75 sm:p-6"
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={closeDialog}
            className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            Close form
          </button>
        </div>

        <CreateOrderForm
          key={formKey}
          recipes={recipes}
        />
      </dialog>
    </>
  );
}
