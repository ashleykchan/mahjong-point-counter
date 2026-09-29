import type { FaanTable, RuleSet } from "../types";
import { defaultHandPatterns } from "./faanCalculator";

/** Classic HK "doubling per faan" table: 3 faan = base unit, doubling up to the limit. */
export function buildDoublingTable(minFaan: number, maxFaan: number, base = 8): FaanTable {
  const table: FaanTable = {};
  for (let f = minFaan; f <= maxFaan; f++) {
    table[f] = base * 2 ** (f - minFaan);
  }
  return table;
}

/** The "one player pays" (deal-in) amount per faan on our group's LDM scoring sheet. */
const LDM_FAAN_TABLE: FaanTable = {
  3: 8,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
  10: 128,
  11: 192,
  12: 256,
  13: 384,
};

export function defaultRuleSet(): RuleSet {
  return {
    id: "default",
    name: "Standard",
    minFaan: 3,
    maxFaan: 13,
    faanTable: { ...LDM_FAAN_TABLE },
    // Deal-in: discarder pays the full table amount. Self-draw: each opponent pays half.
    selfDrawMultiplier: 0.5,
    dealInMultiplier: 1,
    dealerStaysOnDraw: true,
    falseWinPenalty: "min-self-draw",
    falseWinFlatPoints: 8,
    dealerStaysOnFalseWin: true,
    handPatterns: defaultHandPatterns(),
  };
}

/** Alternate starting point for a new custom rule set, kept available in the editor. */
export function doublingRuleSet(): RuleSet {
  const minFaan = 3;
  const maxFaan = 10;
  return {
    id: "doubling",
    name: "Doubling (3-10 faan)",
    minFaan,
    maxFaan,
    faanTable: buildDoublingTable(minFaan, maxFaan, 8),
    selfDrawMultiplier: 1,
    dealInMultiplier: 1,
    dealerStaysOnDraw: true,
    falseWinPenalty: "min-self-draw",
    falseWinFlatPoints: 8,
    dealerStaysOnFalseWin: true,
    handPatterns: defaultHandPatterns(),
  };
}
