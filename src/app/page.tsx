import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { CreateOrderForm } from "@/components/cutting/create-order-form";
import { getCurrentUser } from "@/server/auth/session";
import type { UserRole } from "@/server/auth/types";
import { getProductionRecipes } from "@/server/recipes/get-production-recipes";
import { VerifierTerminal } from "@/components/verification/verifier-terminal";
import { getPendingVerificationOrders } from "@/server/verification/get-pending-orders";
import { RejectedBatchesPanel } from "@/components/cutting/rejected-batches-panel";
import { getRejectedCuttingOrders } from "@/server/cutting/get-rejected-orders";

const workspaceDetails: Record<
  UserRole,
  {
    title: string;
    description: string;
  }
> = {
  cutting_supervisor: {
    title: "Cutting Supervisor Workspace",
    description:
      "Create cutting orders, record fabric usage and manage batches sent for verification.",
  },
  cutting_verifier: {
    title: "Cutting Verification Terminal",
    description:
      "Count physical components, review shortages and approve or reject production batches.",
  },
  sewing_supervisor: {
    title: "Sewing Supervisor Workspace",
    description:
      "Receive verified batches and start sewing assembly operations.",
  },
};

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = workspaceDetails[user.role];

  const recipes =
    user.role === "cutting_supervisor"
      ? await getProductionRecipes()
      : [];

  const rejectedOrders =
    user.role === "cutting_supervisor"
      ? await getRejectedCuttingOrders()
      : [];

  const pendingVerificationOrders =
    user.role === "cutting_verifier"
      ? await getPendingVerificationOrders()
      : [];

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
              ApparelFlow ERP
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Production Execution System
            </h1>
          </div>

          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                Authenticated persona
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                {user.full_name}
              </h2>

              <p className="mt-1 font-mono text-sm text-slate-700">
                {user.role}
              </p>

              <p className="mt-2 text-sm text-slate-600">
                {user.email}
              </p>
            </div>

            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-900">
              Server authenticated
            </span>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
              Current workspace
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {workspace.title}
            </h2>

            <p className="mt-2 max-w-3xl leading-7 text-slate-700">
              {workspace.description}
            </p>
          </div>

          {user.role === "cutting_supervisor" ? (
            <div className="space-y-6">
              <CreateOrderForm recipes={recipes} />

              <RejectedBatchesPanel
                initialOrders={rejectedOrders}
              />
            </div>
          ) : user.role === "cutting_verifier" ? (
            <VerifierTerminal
              initialOrders={pendingVerificationOrders}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
              <p className="font-semibold text-slate-900">
                Sewing workspace implementation is coming next.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                The Sewing Supervisor cannot access Cutting
                Supervisor or Cutting Verifier controls.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
