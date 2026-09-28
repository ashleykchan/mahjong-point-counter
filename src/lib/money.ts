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
