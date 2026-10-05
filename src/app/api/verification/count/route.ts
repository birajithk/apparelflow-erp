import { NextResponse } from "next/server";

import {
  AuthError,
  requireRole,
} from "@/server/auth/guards";
import {
  updateVerificationCount,
  VerificationCountError,
} from "@/server/verification/update-component-count";

export const runtime = "nodejs";

function isValidActualQty(
  value: unknown,
): value is number | null {
  if (value === null) {
    return true;
  }

  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

export async function PATCH(request: Request) {
  try {
    await requireRole("cutting_verifier");

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;

    if (
      typeof payload.verificationItemId !== "string" ||
      payload.verificationItemId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Verification item ID is required" },
        { status: 400 },
      );
    }

    if (!isValidActualQty(payload.actualQty)) {
      return NextResponse.json(
        {
          error:
            "Actual quantity must be a non-negative whole number or null",
        },
        { status: 400 },
      );
    }

    const item = await updateVerificationCount({
      verificationItemId:
        payload.verificationItemId.trim(),
      actualQty: payload.actualQty,
    });

    return NextResponse.json(
      { item },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof VerificationCountError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error(
      "Verification count update failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to update component count" },
      { status: 500 },
    );
  }
}
