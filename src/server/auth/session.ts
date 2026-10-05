import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

import { getDbPool } from "@/server/db/pool";
import type { AuthenticatedUser } from "@/server/auth/types";

export const SESSION_COOKIE_NAME = "apparelflow_session";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const db = getDbPool();

  await db.query(
    `
      DELETE FROM sessions
      WHERE expires_at <= NOW()
    `,
  );

  await db.query(
    `
      INSERT INTO sessions (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt],
  );

  return {
    token,
    expiresAt,
  };
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);

  await getDbPool().query(
    `
      DELETE FROM sessions
      WHERE token_hash = $1
    `,
    [tokenHash],
  );
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const result = await getDbPool().query(
    `
      SELECT
        u.id,
        u.email,
        u.role,
        u.full_name
      FROM sessions s
      INNER JOIN users u
        ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash],
  );

  return (result.rows[0] as AuthenticatedUser | undefined) ?? null;
}
