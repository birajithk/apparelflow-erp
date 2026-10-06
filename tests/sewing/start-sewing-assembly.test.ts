import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/server/db/pool", () => ({
  getDbPool: vi.fn(),
}));

import { getDbPool } from "@/server/db/pool";
import {
  startSewingAssembly,
} from "@/server/sewing/start-sewing-assembly";

const orderId = "test-order-id";
const supervisorId = "test-supervisor-id";

const startedOrder = {
  id: orderId,
  order_no: "CUT-TEST-001",
  status: "IN_SEWING",
  sewing_started_at: new Date(
    "2026-10-06T10:00:00.000Z",
  ),
};

function setupDatabase(
  updateRows: Record<string, unknown>[],
  existingRows: Record<string, unknown>[] = [],
) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("UPDATE cutting_orders AS co")) {
      return { rows: updateRows };
    }

    if (
      /SELECT\s+status\s+FROM cutting_orders/i.test(
        sql,
      )
    ) {
      return { rows: existingRows };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  });

  vi.mocked(getDbPool).mockReturnValue({
    query,
  } as unknown as ReturnType<typeof getDbPool>);

  return { query };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Sewing Assembly hard stop", () => {
  it("starts assembly for a properly verified batch", async () => {
    const { query } = setupDatabase([startedOrder]);

    const result = await startSewingAssembly({
      orderId,
      supervisorId,
    });

    expect(result.status).toBe("IN_SEWING");
    expect(result.orderNo).toBe("CUT-TEST-001");
    expect(result.sewingStartedAt).toBe(
      "2026-10-06T10:00:00.000Z",
    );

    expect(query).toHaveBeenCalledOnce();

    const sql = query.mock.calls[0][0];

    expect(sql).toMatch(
      /co\.status\s*=\s*'VERIFIED'/i,
    );

    expect(sql).toMatch(
      /vl\.decision\s*=\s*'APPROVED'/i,
    );

    expect(sql).toMatch(
      /vl\.order_revision\s*=\s*co\.revision/i,
    );

    expect(sql).toMatch(
      /vli\.actual_qty\s*<\s*vli\.expected_qty/i,
    );

    expect(sql).toContain(
      "sewing_started_by = $2",
    );
  });

  it("blocks a PENDING_VERIFICATION batch", async () => {
    setupDatabase([], [
      { status: "PENDING_VERIFICATION" },
    ]);

    await expect(
      startSewingAssembly({
        orderId,
        supervisorId,
      }),
    ).rejects.toMatchObject({
      status: 422,
      message:
        "Only VERIFIED batches can start sewing",
    });
  });

  it("blocks a VERIFIED batch without a valid approval audit", async () => {
    setupDatabase([], [
      { status: "VERIFIED" },
    ]);

    await expect(
      startSewingAssembly({
        orderId,
        supervisorId,
      }),
    ).rejects.toMatchObject({
      status: 422,
      message:
        "A complete, approved verification audit is required before sewing",
    });
  });

  it("returns 404 for an unknown batch", async () => {
    setupDatabase([], []);

    await expect(
      startSewingAssembly({
        orderId,
        supervisorId,
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: "Cutting order does not exist",
    });
  });

  it("prevents starting an already IN_SEWING batch again", async () => {
    setupDatabase([], [
      { status: "IN_SEWING" },
    ]);

    await expect(
      startSewingAssembly({
        orderId,
        supervisorId,
      }),
    ).rejects.toMatchObject({
      status: 422,
      message:
        "Only VERIFIED batches can start sewing",
    });
  });
});
