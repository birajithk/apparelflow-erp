import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/server/auth/session";
import type { UserRole } from "@/server/auth/types";

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

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
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

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
            Current workspace
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            {workspace.title}
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-700">
            {workspace.description}
          </p>

          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="font-semibold text-slate-900">
              Workspace implementation begins next.
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              Role-specific production controls will be added
              according to the assessment requirements.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
