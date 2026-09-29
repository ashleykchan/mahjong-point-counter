export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function pointsToMoney(points: number, moneyPerPoint: number): number {
  return round2(points * moneyPerPoint);
}

export function formatMoney(amount: number): string {
  const rounded = round2(amount);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toFixed(2)}`;
}

export function signOf(n: number): "+" | "-" | "" {
  if (n > 0) return "+";
  if (n < 0) return "-";
  return "";
}

/** Whole numbers with no decimals (25); cents/fraction only when the amount isn't a whole number (12.50). */
export function formatCompactMagnitude(n: number): string {
  const rounded = round2(Math.abs(n));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}
