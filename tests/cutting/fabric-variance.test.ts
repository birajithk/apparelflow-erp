import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeFabricDifference,
} from "@/lib/fabric-variance";

describe("Fabric variance normalization", () => {
  it("treats mathematically equal fabric measurements as zero", () => {
    const expected = 1.1 * 3;
    const actual = 3.3;

    expect(
      normalizeFabricDifference(actual, expected),
    ).toBe(0);
  });

  it("preserves a genuine fabric shortage", () => {
    const expected = 1.1 * 3;
    const actual = 3.299;

    expect(
      normalizeFabricDifference(actual, expected),
    ).toBeCloseTo(-0.001, 8);
  });

  it("preserves genuine excess fabric usage", () => {
    const expected = 1.1 * 3;
    const actual = 3.301;

    expect(
      normalizeFabricDifference(actual, expected),
    ).toBeCloseTo(0.001, 8);
  });
});
