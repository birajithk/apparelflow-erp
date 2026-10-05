import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/server/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white"
            >
              AF
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                Webtezza Manufacturing ERP
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                ApparelFlow
              </h1>
            </div>
          </div>

          <div className="mt-6 max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              Cutting Operations &amp; Gatekeeper Verification
            </h2>

            <p className="mt-3 leading-7 text-slate-700">
              Production batch verification and sewing queue
              release terminal.
            </p>
          </div>
        </header>

        <LoginForm />
      </div>
    </main>
  );
}
