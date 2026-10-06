import { NextResponse } from "next/server";

import {
  AuthError,
  requireRole,
} from "@/server/auth/guards";
import { getSewingQueue } from "@/server/sewing/get-sewing-queue";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole("sewing_supervisor");

    const orders = await getSewingQueue();

    return NextResponse.json(
      { orders },
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

    console.error(
      "Sewing queue query failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load the Sewing Queue",
      },
      { status: 500 },
    );
  }
}
