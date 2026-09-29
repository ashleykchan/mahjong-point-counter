import { describe, expect, it } from "vitest";
import type { Payout, Player } from "../types";
import { defaultRuleSet } from "./defaultRules";
import { computePayouts, pointsForFaan } from "./scoring";

const players: Player[] = ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() }));
const ruleSet = defaultRuleSet();

// Our LDM scoring sheet: what the discarder pays, and what each opponent pays on a self-draw.
const LDM_ROWS: [faan: number, discard: number, selfDrawEach: number][] = [
  [3, 8, 4],
  [4, 16, 8],
  [5, 24, 12],
  [6, 32, 16],
  [7, 48, 24],
  [8, 64, 32],
  [9, 96, 48],
  [10, 128, 64],
  [11, 192, 96],
  [12, 256, 128],
  [13, 384, 192],
];

function netOf(payouts: Payout[]): Record<string, number> {
  const net: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
  for (const p of payouts) {
    net[p.from] -= p.amount;
    net[p.to] += p.amount;
  }
  return net;
}

describe("computePayouts on the Standard (LDM) table", () => {
  it("covers exactly the 3-13 faan rows", () => {
    expect(ruleSet.minFaan).toBe(3);
    expect(ruleSet.maxFaan).toBe(13);
    expect(Object.keys(ruleSet.faanTable).map(Number)).toEqual(LDM_ROWS.map(([f]) => f));
  });

  it.each(LDM_ROWS)("%i faan off a discard: the discarder alone pays %i", (faan, discard) => {
    const payouts = computePayouts(ruleSet, players, "a", "discard", faan, "c");
    expect(payouts).toEqual([{ from: "c", to: "a", amount: discard }]);
  });

  it.each(LDM_ROWS)("%i faan self-drawn: each of the 3 others pays %i", (faan, _discard, each) => {
    const payouts = computePayouts(ruleSet, players, "b", "self-draw", faan);
    expect(payouts).toEqual([
      { from: "a", to: "b", amount: each },
      { from: "c", to: "b", amount: each },
      { from: "d", to: "b", amount: each },
    ]);
  });

  it("clamps faan outside the table to the min/max rows", () => {
    expect(pointsForFaan(ruleSet, 1)).toBe(8);
    expect(pointsForFaan(ruleSet, 20)).toBe(384);
  });

  it("pays nothing for a discard win with no discarder", () => {
    expect(computePayouts(ruleSet, players, "a", "discard", 5)).toEqual([]);
  });
});

describe("every round is zero-sum", () => {
  const cases = LDM_ROWS.flatMap(([faan]) =>
    players.flatMap((winner) => [
      { faan, winner: winner.id, method: "self-draw" as const, discarder: undefined },
      ...players
        .filter((p) => p.id !== winner.id)
        .map((d) => ({ faan, winner: winner.id, method: "discard" as const, discarder: d.id })),
    ]),
  );

  it(`holds for all ${cases.length} winner / method / discarder / faan combinations`, () => {
    for (const c of cases) {
      const net = netOf(computePayouts(ruleSet, players, c.winner, c.method, c.faan, c.discarder));
      expect(Object.values(net).reduce((s, n) => s + n, 0)).toBe(0);
      expect(net[c.winner]).toBeGreaterThan(0);
    }
  });

  it("holds with a fractional self-draw multiplier on odd table values", () => {
    const odd = { ...ruleSet, faanTable: { ...ruleSet.faanTable, 3: 7 } };
    const net = netOf(computePayouts(odd, players, "a", "self-draw", 3));
    expect(net).toEqual({ a: 10.5, b: -3.5, c: -3.5, d: -3.5 });
  });
});
