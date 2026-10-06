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
import { getSewingQueue } from
  "@/server/sewing/get-sewing-queue";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Sewing Queue isolation", () => {
  it("enforces VERIFIED status in database SQL", async () => {
    const query = vi.fn(async (sql: string) => {
      expect(sql).toContain("FROM cutting_orders co");

      return { rows: [] };
    });

    vi.mocked(getDbPool).mockReturnValue({
      query,
    } as unknown as ReturnType<typeof getDbPool>);

    const orders = await getSewingQueue();

    expect(orders).toEqual([]);
    expect(query).toHaveBeenCalledOnce();

    const sql = query.mock.calls[0][0];

    expect(sql).toMatch(
      /WHERE\s+co\.status\s*=\s*'VERIFIED'/i,
    );

    expect(sql).toMatch(
      /vl\.decision\s*=\s*'APPROVED'/i,
    );

    expect(sql).toMatch(
      /vl\.order_revision\s*=\s*co\.revision/i,
    );
  });
});
