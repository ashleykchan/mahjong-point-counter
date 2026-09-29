import { describe, expect, it } from "vitest";
import type { GameState, Payout, RuleSet } from "../types";
import { defaultRuleSet } from "./defaultRules";
import { buildGameSummaryText } from "./gameSummaryText";
import { withEditedRound, withUndoneLastRound } from "./rounds";
import { computeFalseWinPayouts, computeStandings, falseWinPenaltyEach } from "./scoring";
import { computeGameStats } from "./stats";
import { dealerOf, draw, falseWin, newGame, nonDealerOf, PLAYERS, win } from "./testGame";
import { getCurrentWind } from "./wind";

const sum = (payouts: Payout[]) => payouts.reduce((s, p) => s + p.amount, 0);

function netOf(payouts: Payout[]): Record<string, number> {
  const net: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
  for (const p of payouts) {
    net[p.from] -= p.amount;
    net[p.to] += p.amount;
  }
  return net;
}

function withRules(game: GameState, rules: Partial<RuleSet>): GameState {
  return { ...game, ruleSet: { ...game.ruleSet, ...rules } };
}

describe("false win penalty", () => {
  it("defaults to the min-faan self-draw amount: 4 pts to each of the other 3 on Standard (LDM)", () => {
    const payouts = computeFalseWinPayouts(defaultRuleSet(), PLAYERS, "c");
    expect(payouts).toEqual([
      { from: "c", to: "a", amount: 4 },
      { from: "c", to: "b", amount: 4 },
      { from: "c", to: "d", amount: 4 },
    ]);
    expect(sum(payouts)).toBe(12);
  });

  it("uses the max-faan self-draw amount when set", () => {
    const ruleSet: RuleSet = { ...defaultRuleSet(), falseWinPenalty: "max-self-draw" };
    expect(falseWinPenaltyEach(ruleSet)).toBe(192);
    expect(computeFalseWinPayouts(ruleSet, PLAYERS, "a").map((p) => p.amount)).toEqual([192, 192, 192]);
  });

  it("uses a flat amount when set", () => {
    const ruleSet: RuleSet = { ...defaultRuleSet(), falseWinPenalty: "flat", falseWinFlatPoints: 10 };
    expect(computeFalseWinPayouts(ruleSet, PLAYERS, "b").map((p) => p.amount)).toEqual([10, 10, 10]);
  });

  it("follows the rule set's own table and multiplier", () => {
    // Doubling preset: 3 faan = 8, self-draw x1, so each pays 8; max 10 faan = 1024.
    const doubling: RuleSet = { ...defaultRuleSet(), faanTable: { 3: 8, 10: 1024 }, maxFaan: 10, selfDrawMultiplier: 1 };
    expect(falseWinPenaltyEach(doubling)).toBe(8);
    expect(falseWinPenaltyEach({ ...doubling, falseWinPenalty: "max-self-draw" })).toBe(1024);
  });

  it("defaults to min-faan self-draw for rule sets saved before the setting existed", () => {
    const { falseWinPenalty: _p, falseWinFlatPoints: _f, dealerStaysOnFalseWin: _d, ...legacy } = defaultRuleSet();
    expect(falseWinPenaltyEach(legacy)).toBe(4);
  });

  it.each(["min-self-draw", "max-self-draw", "flat"] as const)("is zero-sum (%s)", (falseWinPenalty) => {
    const ruleSet: RuleSet = { ...defaultRuleSet(), falseWinPenalty, falseWinFlatPoints: 7 };
    for (const p of PLAYERS) {
      const net = netOf(computeFalseWinPayouts(ruleSet, PLAYERS, p.id));
      expect(Object.values(net).reduce((s, n) => s + n, 0)).toBe(0);
      expect(net[p.id]).toBeLessThan(0);
    }
  });
});

describe("dealer after a false win", () => {
  it("stays by default, counting a repeat", () => {
    let game = newGame();
    game = falseWin(game, nonDealerOf(game));
    expect(getCurrentWind(game)).toEqual({ prevailingWind: 0, dealerIndex: 0, dealerSeatNumber: 1, repeatCount: 1 });
  });

  it("stays even when the dealer is the false winner", () => {
    let game = newGame();
    game = falseWin(game, dealerOf(game));
    expect(getCurrentWind(game).dealerIndex).toBe(0);
  });

  it("passes when the rule set says so", () => {
    let game = withRules(newGame(), { dealerStaysOnFalseWin: false });
    game = falseWin(game, dealerOf(game));
    expect(getCurrentWind(game)).toEqual({ prevailingWind: 0, dealerIndex: 1, dealerSeatNumber: 2, repeatCount: 0 });
  });

  it("is independent of the draw setting", () => {
    let game = withRules(newGame({ dealerStaysOnDraw: false }), { dealerStaysOnFalseWin: true });
    game = falseWin(game, "b");
    expect(getCurrentWind(game).dealerIndex).toBe(0);
    game = draw(game);
    expect(getCurrentWind(game).dealerIndex).toBe(1);
  });

  it("moves the prevailing wind on when passing from the 4th dealer", () => {
    let game = withRules(newGame(), { dealerStaysOnFalseWin: false });
    for (let i = 0; i < 4; i++) game = falseWin(game, "a");
    expect(getCurrentWind(game)).toEqual({ prevailingWind: 1, dealerIndex: 0, dealerSeatNumber: 1, repeatCount: 0 });
  });
});

describe("undoing a false win", () => {
  it("rolls back both the penalty and the wind", () => {
    let game = withRules(newGame(), { dealerStaysOnFalseWin: false });
    game = win(game, "b", "discard", 6, "a");
    const before = game;
    game = falseWin(game, "c");
    expect(computeStandings(game)).not.toEqual(computeStandings(before));
    expect(getCurrentWind(game)).not.toEqual(getCurrentWind(before));

    game = { ...game, rounds: withUndoneLastRound(game) };
    expect(computeStandings(game)).toEqual(computeStandings(before));
    expect(getCurrentWind(game)).toEqual(getCurrentWind(before));
  });
});

describe("editing a win into a false win and back", () => {
  // A dealer win followed by two passes; the dealer stays on a false win unless a test overrides it.
  function played(): GameState {
    let game = withRules(newGame(), { dealerStaysOnFalseWin: true });
    game = win(game, "a", "discard", 8, "c"); // dealer A wins: repeat
    game = win(game, "b", "self-draw", 5); // deal passes to B
    game = win(game, "c", "discard", 4, "d"); // deal passes to C
    return game;
  }

  it("turns a dealer win into a false win, clearing the win and replaying the wind", () => {
    const game = played();
    const edited = withEditedRound(game, game.rounds[0].id, { isDraw: false, falseWinnerId: "a" });
    const first = edited[0];
    expect(first.falseWinnerId).toBe("a");
    expect(first.winnerId).toBeUndefined();
    expect(first.faan).toBeUndefined();
    expect(first.discarderId).toBeUndefined();
    expect(first.payouts).toEqual(computeFalseWinPayouts(game.ruleSet, game.players, "a"));

    // Recorded from scratch with the false win in place gives the same history.
    let expected = withRules(newGame(), { dealerStaysOnFalseWin: true });
    expected = falseWin(expected, "a");
    expected = win(expected, "b", "self-draw", 5);
    expected = win(expected, "c", "discard", 4, "d");
    expect(edited.map((r) => [r.windBefore, r.windAfter])).toEqual(expected.rounds.map((r) => [r.windBefore, r.windAfter]));
    expect(computeStandings({ ...game, rounds: edited })).toEqual(computeStandings(expected));
  });

  it("replays a changed dealer outcome when the dealer passes on a false win", () => {
    const game = withRules(played(), { dealerStaysOnFalseWin: false });
    const edited = withEditedRound(game, game.rounds[0].id, { isDraw: false, falseWinnerId: "a" });
    // A no longer repeats: B deals hand 2, and B winning it is now a dealer repeat.
    expect(edited[1].windBefore.dealerIndex).toBe(1);
    expect(edited[2].windBefore).toEqual({ prevailingWind: 0, dealerIndex: 1, dealerSeatNumber: 2, repeatCount: 1 });
  });

  it("restores the original round when edited back", () => {
    const game = played();
    const original = game.rounds[0];
    const asFalseWin = { ...game, rounds: withEditedRound(game, original.id, { isDraw: false, falseWinnerId: "a" }) };
    const restored = withEditedRound(asFalseWin, original.id, {
      isDraw: false,
      winnerId: "a",
      method: "discard",
      discarderId: "c",
      faan: 8,
    });
    expect(restored[0].falseWinnerId).toBeUndefined();
    expect(restored[0].payouts).toEqual(original.payouts);
    expect(restored.map((r) => [r.windBefore, r.windAfter])).toEqual(game.rounds.map((r) => [r.windBefore, r.windAfter]));
    expect(computeStandings({ ...game, rounds: restored })).toEqual(computeStandings(game));
  });

  it("can turn a false win into a draw", () => {
    let game = newGame();
    game = falseWin(game, "d");
    const edited = withEditedRound(game, game.rounds[0].id, { isDraw: true });
    expect(edited[0].falseWinnerId).toBeUndefined();
    expect(edited[0].payouts).toEqual([]);
  });
});

describe("false wins in stats and the summary", () => {
  function game(): GameState {
    let g = newGame();
    g = win(g, "a", "discard", 5, "b");
    g = falseWin(g, "c");
    g = falseWin(g, "c");
    return { ...g, endedAt: 0 };
  }

  it("counts false wins per player, never as a win or the biggest hand", () => {
    const stats = computeGameStats(game());
    expect(stats.perPlayer.c.falseWins).toBe(2);
    expect(stats.perPlayer.c.handsWon).toBe(0);
    expect(stats.perPlayer.c.biggestHandFaan).toBeNull();
    expect(stats.perPlayer.a.falseWins).toBe(0);
    expect(stats.totalHandsPlayed).toBe(3);
    expect(stats.totalDraws).toBe(0);
    expect(stats.highestFaanHand).toEqual({ faan: 5, winnerId: "a" });
  });

  it("counts false wins as hands played in the copy summary, but not as the biggest hand", () => {
    const text = buildGameSummaryText(game());
    expect(text).toContain("3 hands played");
    expect(text).toContain("Biggest hand: A, 5 faan");
  });

  it("leaves no biggest hand when the only results are false wins", () => {
    const g = { ...falseWin(newGame(), "b"), endedAt: 0 };
    expect(buildGameSummaryText(g)).toContain("1 hand played");
    expect(buildGameSummaryText(g)).not.toContain("Biggest hand");
    expect(computeGameStats(g).highestFaanHand).toBeNull();
  });
});
