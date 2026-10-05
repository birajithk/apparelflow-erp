import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getDbPool } from "@/server/db/pool";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";
import type { UserRole } from "@/server/auth/types";

export const runtime = "nodejs";

interface LoginUserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
}

export async function POST(request: Request) {
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
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (
    email.length === 0 ||
    email.length > 254 ||
    password.length === 0 ||
    password.length > 200
  ) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const result = await getDbPool().query(
    `
      SELECT
        id,
        email,
        password_hash,
        role,
        full_name
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
    `,
    [email],
  );

  const user = result.rows[0] as LoginUserRow | undefined;

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash,
  );

  if (!passwordMatches) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const session = await createSession(user.id);

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
  });

  response.headers.set("Cache-Control", "no-store");

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });

  return response;
}
