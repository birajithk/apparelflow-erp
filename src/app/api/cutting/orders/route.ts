import { NextResponse } from "next/server";

import {
  AuthError,
  requireRole,
} from "@/server/auth/guards";
import {
  createCuttingOrder,
  OrderValidationError,
} from "@/server/orders/create-cutting-order";

export const runtime = "nodejs";

function parsePositiveInteger(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function parsePositiveFabricYards(
  value: unknown,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("cutting_supervisor");

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
      typeof payload.recipeId !== "string" ||
      payload.recipeId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 },
      );
    }

    const targetQty = parsePositiveInteger(
      payload.targetQty,
    );

    if (targetQty === null) {
      return NextResponse.json(
        {
          error:
            "Target quantity must be a positive whole number",
        },
        { status: 400 },
      );
    }

    if (
      typeof payload.fabricRollId !== "string" ||
      payload.fabricRollId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Fabric roll ID is required" },
        { status: 400 },
      );
    }

    const actualFabricYards =
      parsePositiveFabricYards(
        payload.actualFabricYards,
      );

    if (actualFabricYards === null) {
      return NextResponse.json(
        {
          error:
            "Actual fabric used must be a positive number",
        },
        { status: 400 },
      );
    }

    const result = await createCuttingOrder({
      recipeId: payload.recipeId.trim(),
      targetQty,
      fabricRollId: payload.fabricRollId.trim(),
      actualFabricYards,
      createdBy: user.id,
    });

    return NextResponse.json(
      result,
      {
        status: 201,
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

    if (error instanceof OrderValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Cutting order creation failed:", error);

    return NextResponse.json(
      { error: "Unable to create cutting order" },
      { status: 500 },
    );
  }
}
