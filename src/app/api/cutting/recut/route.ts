import { NextResponse } from "next/server";

import {
  AuthError,
  requireRole,
} from "@/server/auth/guards";
import {
  RecutError,
  resubmitRejectedOrder,
} from "@/server/cutting/resubmit-rejected-order";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supervisor =
      await requireRole("cutting_supervisor");

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
      typeof payload.additionalFabricYards !==
        "number" ||
      !Number.isFinite(
        payload.additionalFabricYards,
      ) ||
      payload.additionalFabricYards <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Additional fabric used must be a positive number",
        },
        { status: 400 },
      );
    }

    if (
      typeof payload.reason !== "string" ||
      payload.reason.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "A re-cut reason is required" },
        { status: 422 },
      );
    }

    const order = await resubmitRejectedOrder({
      orderId: payload.orderId.trim(),
      additionalFabricYards:
        payload.additionalFabricYards,
      reason: payload.reason,
      supervisorId: supervisor.id,
    });

    return NextResponse.json(
      { order },
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

    if (error instanceof RecutError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Re-cut submission failed:", error);

    return NextResponse.json(
      {
        error:
          "Unable to submit rejected batch for re-cut verification",
      },
      { status: 500 },
    );
  }
}
