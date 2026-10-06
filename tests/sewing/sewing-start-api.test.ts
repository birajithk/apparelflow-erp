import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/server/auth/guards", () => ({
  AuthError: class AuthError extends Error {
    status = 403;
  },
  requireRole: vi.fn(),
}));

vi.mock(
  "@/server/sewing/start-sewing-assembly",
  () => ({
    startSewingAssembly: vi.fn(),
    SewingStartError: class extends Error {},
  }),
);

import { requireRole } from "@/server/auth/guards";

import {
  startSewingAssembly,
} from "@/server/sewing/start-sewing-assembly";

import { POST } from "@/app/api/sewing/start/route";

const endpoint =
  "http://localhost:3000/api/sewing/start";

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

describe("Sewing Start API validation", () => {
  it("rejects an empty order ID", async () => {
    const response = await POST(
      makeRequest({ orderId: "" }),
    );

    expect(response.status).toBe(400);
    expect(startSewingAssembly).not.toHaveBeenCalled();
  });

  it("rejects a numeric order ID", async () => {
    const response = await POST(
      makeRequest({ orderId: 123 }),
    );

    expect(response.status).toBe(400);
    expect(startSewingAssembly).not.toHaveBeenCalled();
  });

  it("rejects an array request body", async () => {
    const response = await POST(
      makeRequest([]),
    );

    expect(response.status).toBe(400);
    expect(startSewingAssembly).not.toHaveBeenCalled();
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
    expect(startSewingAssembly).not.toHaveBeenCalled();
  });

  it("uses the authenticated supervisor ID instead of a spoofed ID", async () => {
    vi.mocked(startSewingAssembly).mockResolvedValue({
      id: "order-123",
      orderNo: "CUT-TEST-001",
      status: "IN_SEWING",
      sewingStartedAt: "2026-10-06T10:00:00.000Z",
    });

    const response = await POST(
      makeRequest({
        orderId: "order-123",
        supervisorId: "attacker-controlled-id",
      }),
    );

    expect(response.status).toBe(200);

    expect(requireRole).toHaveBeenCalledWith(
      "sewing_supervisor",
    );

    expect(startSewingAssembly).toHaveBeenCalledWith({
      orderId: "order-123",
      supervisorId: "authenticated-supervisor-id",
    });
  });
});
