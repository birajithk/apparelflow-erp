import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/server/auth/guards", () => {
  class ForbiddenError extends Error {
    readonly status = 403;

    constructor() {
      super("Forbidden");
    }
  }

  return {
    AuthError: ForbiddenError,
    requireRole: vi.fn(async () => {
      throw new ForbiddenError();
    }),
  };
});

vi.mock(
  "@/server/verification/decide-verification",
  () => ({
    decideVerification: vi.fn(),
    VerificationDecisionError: class extends Error {},
  }),
);

import { requireRole } from "@/server/auth/guards";

import { decideVerification } from
  "@/server/verification/decide-verification";

import { POST } from
  "@/app/api/verification/decision/route";

describe("Verification API role isolation", () => {
  it("returns 403 before non-verifiers can approve", async () => {
    const request = new Request(
      "http://localhost:3000/api/verification/decision",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: "test-order",
          decision: "APPROVED",
        }),
      },
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");

    expect(requireRole).toHaveBeenCalledWith(
      "cutting_verifier",
    );

    expect(decideVerification).not.toHaveBeenCalled();
  });
});
