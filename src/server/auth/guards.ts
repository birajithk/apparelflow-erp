import "server-only";

import { getCurrentUser } from "@/server/auth/session";
import type {
  AuthenticatedUser,
  UserRole,
} from "@/server/auth/types";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthError("Authentication required", 401);
  }

  return user;
}

export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError("Forbidden", 403);
  }

  return user;
}
