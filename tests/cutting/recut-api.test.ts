import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/server/auth/guards", () => ({
  AuthError: class extends Error {
    status = 403;
  },
  requireRole: vi.fn(),
}));

vi.mock(
  "@/server/cutting/resubmit-rejected-order",
  () => ({
    RecutError: class extends Error {},
    resubmitRejectedOrder: vi.fn(),
  }),
);

import {
  AuthError,
  requireRole,
} from "@/server/auth/guards";

import {
  resubmitRejectedOrder,
} from "@/server/cutting/resubmit-rejected-order";

import { POST } from "@/app/api/cutting/recut/route";

const endpoint =
  "http://localhost:3000/api/cutting/recut";

const validPayload = {
  orderId: "rejected-order-id",
  additionalFabricYards: 2.5,
  reason: "Re-cut damaged panels",
};

function makeRequest(body: unknown) {
  return new Request(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(requireRole).mockResolvedValue({
    id: "authenticated-supervisor-id",
  } as Awaited<ReturnType<typeof requireRole>>);
});

describe("Re-cut API security and validation", () => {
  it("blocks non-supervisors with 403", async () => {
    const forbidden = new (
      AuthError as unknown as new (
        message: string,
      ) => Error
    )("Forbidden");

    vi.mocked(requireRole).mockRejectedValue(
      forbidden,
    );

    const response = await POST(
      makeRequest(validPayload),
    );

    expect(response.status).toBe(403);

    expect(requireRole).toHaveBeenCalledWith(
      "cutting_supervisor",
    );

    expect(
      resubmitRejectedOrder,
    ).not.toHaveBeenCalled();
  });

  it("rejects an empty order ID", async () => {
    const response = await POST(
      makeRequest({
        ...validPayload,
        orderId: "",
      }),
    );

    expect(response.status).toBe(400);

    expect(
      resubmitRejectedOrder,
    ).not.toHaveBeenCalled();
  });

  it.each([0, -2.5, "2.5"])(
    "rejects invalid additional fabric yards: %s",
    async (additionalFabricYards) => {
      const response = await POST(
        makeRequest({
          ...validPayload,
          additionalFabricYards,
        }),
      );

      expect(response.status).toBe(400);

      expect(
        resubmitRejectedOrder,
      ).not.toHaveBeenCalled();
    },
  );

  it("requires a non-empty re-cut reason", async () => {
    const response = await POST(
      makeRequest({
        ...validPayload,
        reason: "   ",
      }),
    );

    expect(response.status).toBe(422);

    const body = await response.json();

    expect(body.error).toBe(
      "A re-cut reason is required",
    );

    expect(
      resubmitRejectedOrder,
    ).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const request = new Request(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{invalid-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    expect(
      resubmitRejectedOrder,
    ).not.toHaveBeenCalled();
  });

  it("uses the authenticated supervisor instead of a spoofed identity", async () => {
    vi.mocked(
      resubmitRejectedOrder,
    ).mockResolvedValue({
      id: "rejected-order-id",
      orderNo: "CUT-TEST-001",
      status: "PENDING_VERIFICATION",
      revision: 2,
      actualFabricYards: 94,
      submittedAt:
        "2026-10-06T10:00:00.000Z",
    });

    const response = await POST(
      makeRequest({
        ...validPayload,
        supervisorId: "attacker-controlled-id",
      }),
    );

    expect(response.status).toBe(200);

    expect(requireRole).toHaveBeenCalledWith(
      "cutting_supervisor",
    );

    expect(
      resubmitRejectedOrder,
    ).toHaveBeenCalledWith({
      orderId: "rejected-order-id",
      additionalFabricYards: 2.5,
      reason: "Re-cut damaged panels",
      supervisorId:
        "authenticated-supervisor-id",
    });
  });
});
