import type { FaanTable, RuleSet } from "../types";

/** Classic HK "doubling per faan" table: 3 faan = base unit, doubling up to the limit. */
export function buildDoublingTable(minFaan: number, maxFaan: number, base = 8): FaanTable {
  const table: FaanTable = {};
  for (let f = minFaan; f <= maxFaan; f++) {
    table[f] = base * 2 ** (f - minFaan);
  }
  return table;
}

export function defaultRuleSet(): RuleSet {
  const minFaan = 3;
  const maxFaan = 10;
  return {
    id: "default",
    name: "Standard (3-10 faan)",
    minFaan,
    maxFaan,
    faanTable: buildDoublingTable(minFaan, maxFaan, 8),
    selfDrawMultiplier: 1,
    dealInMultiplier: 1,
    dealerStaysOnDraw: true,
  };
}
