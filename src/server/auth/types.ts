export type UserRole =
  | "cutting_supervisor"
  | "cutting_verifier"
  | "sewing_supervisor";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}
