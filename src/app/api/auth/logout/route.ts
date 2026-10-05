import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  deleteSession,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(
    SESSION_COOKIE_NAME,
  )?.value;

  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({
    message: "Logged out",
  });

  response.headers.set("Cache-Control", "no-store");

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
