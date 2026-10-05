import { NextResponse } from "next/server";

import {
  AuthError,
  requireRole,
} from "@/server/auth/guards";
import { getPendingVerificationOrders } from "@/server/verification/get-pending-orders";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole("cutting_verifier");

    const orders = await getPendingVerificationOrders();

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
      "Pending verification query failed:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to load pending verification orders" },
      { status: 500 },
    );
  }
}
