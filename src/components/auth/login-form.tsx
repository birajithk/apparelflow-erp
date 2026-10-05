"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const demoAccounts = [
  {
    label: "Cutting Supervisor",
    role: "cutting_supervisor",
    email: "cutting.supervisor@apparelflow.demo",
    password: "cutting.supervisor@2026",
    description:
      "Creates cutting orders, records fabric usage and manages re-cutting.",
  },
  {
    label: "Cutting Verifier",
    role: "cutting_verifier",
    email: "cutting.verifier@apparelflow.demo",
    password: "cutting.verifier@2026",
    description:
      "Performs component count QC and approves or rejects batches.",
  },
  {
    label: "Sewing Supervisor",
    role: "sewing_supervisor",
    email: "sewing.supervisor@apparelflow.demo",
    password: "sewing.supervisor@2026",
    description:
      "Views verified batches and starts sewing assembly.",
  },
] as const;

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadDemoCredentials(
    account: (typeof demoAccounts)[number],
  ) {
    setEmail(account.email);
    setPassword(account.password);
    setSelectedRole(account.role);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as {
          error?: string;
        };

        setError(data.error ?? "Unable to sign in.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section
        aria-labelledby="demo-personas-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
            Demo credential panel
          </p>

          <h2
            id="demo-personas-heading"
            className="mt-2 text-2xl font-bold text-slate-950"
          >
            Factory personas
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            Select a factory role to load its demo credentials
            into the secure login form.
          </p>
        </div>

        <div className="space-y-4">
          {demoAccounts.map((account) => {
            const isSelected = selectedRole === account.role;

            return (
              <article
                key={account.role}
                className={`rounded-xl border p-4 transition ${
                  isSelected
                    ? "border-blue-700 bg-blue-50"
                    : "border-slate-300 bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {account.label}
                    </p>

                    <p className="mt-1 font-mono text-xs text-slate-600">
                      {account.role}
                    </p>
                  </div>

                  {isSelected ? (
                    <span className="w-fit rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white">
                      Selected
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {account.description}
                </p>

                <div className="mt-4 rounded-lg bg-slate-100 p-3">
                  <p className="break-all text-xs text-slate-800">
                    <span className="font-semibold">Demo email:</span>{" "}
                    {account.email}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Password is loaded securely into the masked
                    password field.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadDemoCredentials(account)}
                  className="mt-4 rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-200"
                >
                  Load demo credentials
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="sign-in-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
            Secure authentication
          </p>

          <h2
            id="sign-in-heading"
            className="mt-2 text-2xl font-bold text-slate-950"
          >
            Sign in
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            Authentication and role enforcement are validated
            by the server.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              placeholder="Enter password"
            />
          </div>

          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
