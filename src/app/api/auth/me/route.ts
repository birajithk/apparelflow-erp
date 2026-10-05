import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
