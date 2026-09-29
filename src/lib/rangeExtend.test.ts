import { describe, expect, it } from "vitest";
import type { FaanTable } from "../types";
import { defaultRuleSet } from "./defaultRules";
import { extendTable } from "./rangeExtend";

const LDM = defaultRuleSet().faanTable;

/** Mirrors the Rule Editor: every range change runs extendTable, and saving keeps only rows in range. */
function editRange(table: FaanTable, steps: [min: number, max: number][]) {
  let t = table;
  for (const [min, max] of steps) t = extendTable(t, min, max);
  return t;
}

function inRange(table: FaanTable, min: number, max: number): FaanTable {
  const out: FaanTable = {};
  for (let f = min; f <= max; f++) out[f] = table[f];
  return out;
}

describe("min/max faan range editing", () => {
  it("restores the LDM table exactly after shrinking and re-expanding in the editor", () => {
    const table = editRange(LDM, [
      [3, 8], // lower the max
      [6, 8], // raise the min
      [6, 6], // squeeze to one row
      [1, 6], // widen past the original min
      [1, 13], // and back up to the original max
      [3, 13],
    ]);
    expect(inRange(table, 3, 13)).toEqual(LDM);
  });

  it("restores the LDM rows above a saved, narrowed range (the table's step pattern continues)", () => {
    const saved = inRange(LDM, 3, 5); // saved as 3-5 faan, other rows dropped
    expect(inRange(extendTable(saved, 3, 13), 3, 13)).toEqual(LDM);
  });

  it("never touches rows that already have a value", () => {
    const custom = { 3: 10, 4: 11, 5: 999 };
    expect(inRange(extendTable(custom, 3, 5), 3, 5)).toEqual(custom);
  });

  it("fills new rows below by halving, never below 1", () => {
    expect(inRange(extendTable({ 3: 8, 4: 16 }, 1, 4), 1, 4)).toEqual({ 1: 2, 2: 4, 3: 8, 4: 16 });
    expect(extendTable({ 2: 1 }, 1, 2)[1]).toBe(1);
  });
});
