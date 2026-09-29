import { describe, expect, it } from "vitest";
import type { Payout } from "../types";
import { round2 } from "./money";
import { gameSettlement, settleUp } from "./settleUp";
import { newGame, win } from "./testGame";

type Balances = { id: string; amount: number }[];

/** Fewest payments possible: one fewer than the number of non-zero players, per group that can settle on its own. */
function optimalPaymentCount(amounts: number[]): number {
  const cents = amounts.map((a) => Math.round(a * 100)).filter((c) => c !== 0);
  const n = cents.length;
  // best[mask] = most zero-sum groups the players in `mask` can be split into (mask must sum to zero).
  const best = new Array<number>(1 << n).fill(-Infinity);
  best[0] = 0;
  const sum = (mask: number) => cents.reduce((s, c, i) => (mask & (1 << i) ? s + c : s), 0);
  for (let mask = 1; mask < 1 << n; mask++) {
    if (sum(mask) !== 0) continue;
    for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
      if (sum(sub) === 0 && best[mask ^ sub] >= 0) best[mask] = Math.max(best[mask], best[mask ^ sub] + 1);
    }
  }
  return n - best[(1 << n) - 1];
}

function remaining(balances: Balances, payouts: Payout[]): number[] {
  const left = Object.fromEntries(balances.map((b) => [b.id, b.amount]));
  for (const p of payouts) {
    left[p.from] += p.amount;
    left[p.to] -= p.amount;
  }
  return Object.values(left).map((v) => round2(v) + 0); // + 0 turns -0 into 0
}

/** Small deterministic PRNG so the generated cases are the same every run. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zero-sum 4-player balances built from real LDM payouts at a given $/pt, with some even (zero) players. */
function randomBalances(rand: () => number, moneyPerPoint: number): Balances {
  const table = [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384];
  const points = [0, 0, 0, 0];
  const hands = Math.floor(rand() * 12);
  for (let h = 0; h < hands; h++) {
    const winner = Math.floor(rand() * 4);
    const base = table[Math.floor(rand() * table.length)];
    if (rand() < 0.4) {
      for (let p = 0; p < 4; p++) {
        if (p === winner) continue;
        points[p] -= base / 2;
        points[winner] += base / 2;
      }
    } else {
      const discarder = (winner + 1 + Math.floor(rand() * 3)) % 4;
      points[discarder] -= base;
      points[winner] += base;
    }
  }
  return points.map((p, i) => ({ id: "abcd"[i], amount: round2(p * moneyPerPoint) }));
}

describe("settleUp", () => {
  it("settles one big winner with three payments", () => {
    const payouts = settleUp([
      { id: "a", amount: 30 },
      { id: "b", amount: -10 },
      { id: "c", amount: -12 },
      { id: "d", amount: -8 },
    ]);
    expect(payouts).toHaveLength(3);
    expect(payouts.every((p) => p.to === "a")).toBe(true);
  });

  it("pairs off matching debts in two payments", () => {
    const payouts = settleUp([
      { id: "a", amount: 25 },
      { id: "b", amount: -25 },
      { id: "c", amount: 7.5 },
      { id: "d", amount: -7.5 },
    ]);
    expect(payouts).toEqual([
      { from: "b", to: "a", amount: 25 },
      { from: "d", to: "c", amount: 7.5 },
    ]);
  });

  it("makes no payments when everyone is even", () => {
    expect(settleUp(["a", "b", "c", "d"].map((id) => ({ id, amount: 0 })))).toEqual([]);
  });

  it("rounds to the cent even when the balances carry float noise", () => {
    const balances = [
      { id: "a", amount: 0.1 + 0.2 }, // 0.30000000000000004
      { id: "b", amount: -0.3 },
      { id: "c", amount: 1 / 3 },
      { id: "d", amount: -1 / 3 },
    ];
    for (const p of settleUp(balances)) expect(p.amount).toBe(round2(p.amount));
  });

  it.each([0.5, 0.25, 0.1, 1, 0.05])(
    "at $%s/pt, uses the fewest payments, balances everyone to zero and rounds to the cent (500 generated tables)",
    (moneyPerPoint) => {
      const rand = mulberry32(Math.round(moneyPerPoint * 1000));
      for (let i = 0; i < 500; i++) {
        const balances = randomBalances(rand, moneyPerPoint);
        const payouts = settleUp(balances);
        expect(payouts.length, JSON.stringify(balances)).toBe(optimalPaymentCount(balances.map((b) => b.amount)));
        expect(remaining(balances, payouts), JSON.stringify(balances)).toEqual([0, 0, 0, 0]);
        for (const p of payouts) {
          expect(p.amount).toBeGreaterThan(0);
          expect(p.amount).toBe(round2(p.amount));
        }
      }
    },
  );
});

describe("gameSettlement", () => {
  it("settles what each player won or lost, not their running totals, when starting scores aren't zero", () => {
    let game = newGame({ startingScores: { a: 500, b: 500, c: 500, d: 500 } });
    game = win(game, "a", "discard", 5, "b"); // B pays A 24 pts
    // At $0.50/pt: A +$12, B -$12. Nobody else moved.
    expect(gameSettlement(game)).toEqual([{ from: "b", to: "a", amount: 12 }]);
  });

  it("matches the payouts made during the game", () => {
    let game = newGame();
    game = win(game, "c", "self-draw", 13); // each pays 192 pts = $96
    expect(gameSettlement(game)).toEqual([
      { from: "a", to: "c", amount: 96 },
      { from: "b", to: "c", amount: 96 },
      { from: "d", to: "c", amount: 96 },
    ]);
  });

  it("is empty for points-only games", () => {
    const game = win({ ...newGame(), moneyPerPoint: 0 }, "a");
    expect(gameSettlement(game)).toEqual([]);
  });
});
