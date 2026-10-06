import { NextResponse } from "next/server";

import {
  AuthError,
  requireRole,
} from "@/server/auth/guards";

import {
  SewingStartError,
  startSewingAssembly,
} from "@/server/sewing/start-sewing-assembly";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Authenticate and authorize BEFORE processing
    // the request body.
    const supervisor =
      await requireRole("sewing_supervisor");

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const payload =
      body as Record<string, unknown>;

    if (
      typeof payload.orderId !== "string" ||
      payload.orderId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    const order = await startSewingAssembly({
      orderId: payload.orderId.trim(),
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
    if (
      error instanceof AuthError ||
      error instanceof SewingStartError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error(
      "Start Sewing Assembly failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to start sewing assembly",
      },
      { status: 500 },
    );
  }
}
