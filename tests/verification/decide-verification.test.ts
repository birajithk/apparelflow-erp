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
  decideVerification,
} from "@/server/verification/decide-verification";

const verifierId = "verifier-test-id";
const orderId = "order-test-id";

const order = {
  id: orderId,
  order_no: "CUT-TEST-001",
  recipe_id: "recipe-test-id",
  target_qty: 50,
  actual_fabric_yds: "91.500",
  status: "PENDING_VERIFICATION",
  revision: 1,
  std_fabric_yards: "1.800",
  wastage_pct: "1.666667",
};

function makeItems(
  statuses: Array<"GREEN" | "YELLOW" | "RED" | null>,
) {
  return statuses.map((status, index) => {
    const expected = index === 2 ? 100 : 50;

    return {
      id: `item-${index}`,
      component_id: `component-${index}`,
      expected_qty: expected,
      actual_qty:
        status === null
          ? null
          : status === "RED"
            ? expected - 1
            : status === "YELLOW"
              ? expected + 1
              : expected,
      status,
    };
  });
}

function setupDatabase(
  statuses: Array<"GREEN" | "YELLOW" | "RED" | null>,
) {
  const items = makeItems(statuses);

  const query = vi.fn(
    async (statement: string) => {
      const sql = statement.trim();

      if (
        sql === "BEGIN" ||
        sql === "COMMIT" ||
        sql === "ROLLBACK"
      ) {
        return { rows: [] };
      }

      if (
        sql.includes("FROM cutting_orders co") &&
        sql.includes("FOR UPDATE OF co")
      ) {
        return { rows: [order] };
      }

      if (
        sql.includes("FROM verification_items") &&
        sql.includes("FOR UPDATE")
      ) {
        return { rows: items };
      }

      if (
        sql.includes("FROM recipe_components") &&
        sql.includes("component_count")
      ) {
        return {
          rows: [{ component_count: 3 }],
        };
      }

      if (
        sql.includes("INSERT INTO verification_logs")
      ) {
        return {
          rows: [
            {
              id: "verification-log-test-id",
              decision: "APPROVED",
              rejection_note: null,
              wastage_pct: "1.666667",
              decided_at: new Date(
                "2026-10-05T10:00:00.000Z",
              ),
            },
          ],
        };
      }

      if (
        sql.includes(
          "INSERT INTO verification_log_items",
        )
      ) {
        return { rows: [] };
      }

      if (
        sql.includes("UPDATE cutting_orders")
      ) {
        return { rows: [] };
      }

      throw new Error(
        `Unexpected database query: ${sql}`,
      );
    },
  );

  const release = vi.fn();

  vi.mocked(getDbPool).mockReturnValue({
    connect: vi.fn().mockResolvedValue({
      query,
      release,
    }),
  } as unknown as ReturnType<typeof getDbPool>);

  return { query, release };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Cutting verification gatekeeper", () => {
  it("approves an order when every component is GREEN", async () => {
    const { query, release } = setupDatabase([
      "GREEN",
      "GREEN",
      "GREEN",
    ]);

    const result = await decideVerification({
      orderId,
      verifierId,
      decision: "APPROVED",
      rejectionNote: null,
    });

    expect(result.status).toBe("VERIFIED");
    expect(result.decision).toBe("APPROVED");

    const statements = query.mock.calls.map(
      ([sql]) => sql.trim(),
    );

    expect(
      statements.some((sql) =>
        sql.includes("INSERT INTO verification_logs"),
      ),
    ).toBe(true);

    expect(
      statements.some((sql) =>
        sql.includes(
          "INSERT INTO verification_log_items",
        ),
      ),
    ).toBe(true);

    expect(statements).toContain("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("blocks approval when one component is RED", async () => {
    const { query, release } = setupDatabase([
      "GREEN",
      "RED",
      "GREEN",
    ]);

    await expect(
      decideVerification({
        orderId,
        verifierId,
        decision: "APPROVED",
        rejectionNote: null,
      }),
    ).rejects.toMatchObject({
      status: 422,
      message:
        "Approval blocked: one or more components have a shortage",
    });

    const statements = query.mock.calls.map(
      ([sql]) => sql.trim(),
    );

    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");

    expect(
      statements.some((sql) =>
        sql.includes("INSERT INTO verification_logs"),
      ),
    ).toBe(false);

    expect(release).toHaveBeenCalledOnce();
  });

  it("rejects a rejection decision without a reason", async () => {
    const { query, release } = setupDatabase([
      "GREEN",
      "GREEN",
      "GREEN",
    ]);

    await expect(
      decideVerification({
        orderId,
        verifierId,
        decision: "REJECTED",
        rejectionNote: "   ",
      }),
    ).rejects.toMatchObject({
      status: 422,
      message: "A rejection reason is required",
    });

    const statements = query.mock.calls.map(
      ([sql]) => sql.trim(),
    );

    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");

    expect(release).toHaveBeenCalledOnce();
  });

  it("allows YELLOW excess when no component is short", async () => {
    const { query } = setupDatabase([
      "GREEN",
      "YELLOW",
      "GREEN",
    ]);

    const result = await decideVerification({
      orderId,
      verifierId,
      decision: "APPROVED",
      rejectionNote: null,
    });

    expect(result.status).toBe("VERIFIED");

    const statements = query.mock.calls.map(
      ([sql]) => sql.trim(),
    );

    expect(statements).toContain("COMMIT");
  });

  it("blocks approval when a component is uncounted", async () => {
    const { query } = setupDatabase([
      "GREEN",
      null,
      "GREEN",
    ]);

    await expect(
      decideVerification({
        orderId,
        verifierId,
        decision: "APPROVED",
        rejectionNote: null,
      }),
    ).rejects.toMatchObject({
      status: 422,
      message:
        "Approval blocked: every component must be counted before approval",
    });

    const statements = query.mock.calls.map(
      ([sql]) => sql.trim(),
    );

    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");
  });

  it("blocks approval when a required component is missing", async () => {
    const { query } = setupDatabase([
      "GREEN",
      "GREEN",
    ]);

    // The mocked recipe requires three components,
    // but only two verification items exist.
    await expect(
      decideVerification({
        orderId,
        verifierId,
        decision: "APPROVED",
        rejectionNote: null,
      }),
    ).rejects.toMatchObject({
      status: 422,
      message:
        "Approval blocked: one or more required verification components are missing",
    });

    const statements = query.mock.calls.map(
      ([sql]) => sql.trim(),
    );

    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");
  });
});
