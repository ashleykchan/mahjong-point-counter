import type { FaanTable } from "../types";

const HALF_SPICY_HIGH = 1.5;
const HALF_SPICY_LOW = 4 / 3;
const RATIO_TOLERANCE = 0.02;

function ratioNear(actual: number, target: number): boolean {
  return Math.abs(actual - target) < RATIO_TOLERANCE;
}

/**
 * Fills in any missing rows in [min, max], without ever touching a row that already has a
 * value. That's what lets shrinking the range and expanding it back restore the user's exact
 * numbers instead of regenerating them.
 *
 * - A missing row below the known range is half the row above it (rounded, minimum 1).
 * - A missing row above the known range continues the existing step pattern: if the last step
 *   alternates between x1.5 and x(4/3) ("half-spicy"), the next step continues that alternation;
 *   otherwise it doubles.
 */
export function extendTable(table: FaanTable, min: number, max: number): FaanTable {
  const next = { ...table };
  const defined = Object.keys(next)
    .map(Number)
    .filter((f) => next[f] !== undefined);
  if (defined.length === 0) return next;

  const lowestDefined = Math.min(...defined);
  for (let f = lowestDefined - 1; f >= min; f--) {
    if (next[f] === undefined) {
      next[f] = Math.max(1, Math.round(next[f + 1] / 2));
    }
  }

  const highestDefined = Math.max(...defined);
  if (max > highestDefined) {
    const last = next[highestDefined];
    const prev = next[highestDefined - 1];
    let nextMultiplier = 2;
    let alternating = false;
    if (prev) {
      const lastStep = last / prev;
      if (ratioNear(lastStep, HALF_SPICY_HIGH)) {
        nextMultiplier = HALF_SPICY_LOW;
        alternating = true;
      } else if (ratioNear(lastStep, HALF_SPICY_LOW)) {
        nextMultiplier = HALF_SPICY_HIGH;
        alternating = true;
      }
    }

    let current = last;
    for (let f = highestDefined + 1; f <= max; f++) {
      if (next[f] === undefined) {
        current = Math.round(current * nextMultiplier);
        next[f] = current;
        if (alternating) {
          nextMultiplier = nextMultiplier === HALF_SPICY_HIGH ? HALF_SPICY_LOW : HALF_SPICY_HIGH;
        }
      } else {
        current = next[f];
      }
    }
  }

  return next;
}
