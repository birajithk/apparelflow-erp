export function normalizeFabricDifference(
  actual: number,
  expected: number,
): number {
  const difference = actual - expected;

  // Ignore floating-point representation noise,
  // but preserve genuine fabric measurement differences.
  const tolerance =
    Number.EPSILON *
    16 *
    Math.max(1, Math.abs(actual), Math.abs(expected));

  return Math.abs(difference) <= tolerance
    ? 0
    : difference;
}
