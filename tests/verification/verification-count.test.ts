import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateVerificationStatus,
  parseVerificationCount,
} from "@/lib/verification-count";

describe("Verification component count validation", () => {
  it("accepts zero as a valid shortage count", () => {
    expect(parseVerificationCount("0")).toEqual({
      valid: true,
      actualQty: 0,
      error: null,
    });

    expect(
      calculateVerificationStatus(0, 50),
    ).toBe("RED");
  });

  it("accepts positive whole-number counts", () => {
    expect(parseVerificationCount("50")).toEqual({
      valid: true,
      actualQty: 50,
      error: null,
    });
  });

  it.each(["-1", "2.5", "abc", "1e2"])(
    "rejects invalid count input: %s",
    (value) => {
      expect(parseVerificationCount(value)).toMatchObject({
        valid: false,
        actualQty: null,
      });
    },
  );

  it("treats an empty field as uncounted", () => {
    expect(parseVerificationCount("")).toEqual({
      valid: true,
      actualQty: null,
      error: null,
    });
  });

  it("calculates GREEN, YELLOW and RED correctly", () => {
    expect(calculateVerificationStatus(50, 50)).toBe(
      "GREEN",
    );

    expect(calculateVerificationStatus(51, 50)).toBe(
      "YELLOW",
    );

    expect(calculateVerificationStatus(49, 50)).toBe(
      "RED",
    );
  });
});
