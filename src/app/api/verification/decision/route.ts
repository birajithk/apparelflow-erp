import { NextResponse } from "next/server";

import {
  AuthError,
  requireRole,
} from "@/server/auth/guards";
import {
  decideVerification,
  VerificationDecisionError,
  type VerificationDecision,
} from "@/server/verification/decide-verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const verifier =
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

    const payload = body as Record<
      string,
      unknown
    >;

    if (
      typeof payload.orderId !== "string" ||
      payload.orderId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    if (
      payload.decision !== "APPROVED" &&
      payload.decision !== "REJECTED"
    ) {
      return NextResponse.json(
        {
          error:
            "Decision must be APPROVED or REJECTED",
        },
        { status: 400 },
      );
    }

    const decision =
      payload.decision as VerificationDecision;

    let rejectionNote: string | null = null;

    if (decision === "REJECTED") {
      if (
        typeof payload.rejectionNote !==
          "string" ||
        payload.rejectionNote.trim().length === 0
      ) {
        return NextResponse.json(
          {
            error:
              "A rejection reason is required",
          },
          { status: 422 },
        );
      }

      rejectionNote =
        payload.rejectionNote.trim();
    }

    const result = await decideVerification({
      orderId: payload.orderId.trim(),
      verifierId: verifier.id,
      decision,
      rejectionNote,
    });

    return NextResponse.json(
      { verification: result },
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

    if (
      error instanceof VerificationDecisionError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error(
      "Verification decision failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to process verification decision",
      },
      { status: 500 },
    );
  }
}
