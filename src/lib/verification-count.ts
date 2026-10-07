export type VerificationCountStatus =
  | "GREEN"
  | "YELLOW"
  | "RED"
  | null;

export interface ParsedVerificationCount {
  valid: boolean;
  actualQty: number | null;
  error: string | null;
}

export function parseVerificationCount(
  rawValue: string,
): ParsedVerificationCount {
  if (rawValue === "") {
    return {
      valid: true,
      actualQty: null,
      error: null,
    };
  }

  if (!/^\d+$/.test(rawValue)) {
    return {
      valid: false,
      actualQty: null,
      error:
        "Component count must be a non-negative whole number.",
    };
  }

  const actualQty = Number(rawValue);

  if (!Number.isSafeInteger(actualQty)) {
    return {
      valid: false,
      actualQty: null,
      error: "Component count is too large.",
    };
  }

  return {
    valid: true,
    actualQty,
    error: null,
  };
}

export function calculateVerificationStatus(
  actualQty: number | null,
  expectedQty: number,
): VerificationCountStatus {
  if (actualQty === null) {
    return null;
  }

  if (actualQty === expectedQty) {
    return "GREEN";
  }

  if (actualQty > expectedQty) {
    return "YELLOW";
  }

  return "RED";
}
