import { describe, expect, it } from "vitest";
import type { GameState, Round } from "../types";
import { withDeletedRound, withEditedRound, withUndoneLastRound } from "./rounds";
import { computeStandings } from "./scoring";
import { getCurrentWind } from "./wind";
import { adjust, dealerOf, draw, newGame, win } from "./testGame";

/** Wind fields only, so rounds built separately can be compared. */
const winds = (rounds: Round[]) => rounds.map((r) => ({ before: r.windBefore, after: r.windAfter }));

/** A with dealer repeat, then B, C and a draw: A deals twice, then B, C, D. */
function sampleGame(): GameState {
  let game = newGame();
  game = win(game, "a"); // dealer A repeats
  game = win(game, "b", "discard", 5, "a"); // deal passes to B
  game = win(game, "c", "self-draw", 4); // deal passes to C
  game = draw(game); // C stays
  game = win(game, "a", "discard", 6, "d"); // deal passes to D
  return game;
}

describe("editing an early round", () => {
  it("replays the wind for every later round, as if the edited outcome had been recorded", () => {
    const game = sampleGame();
    const edited = withEditedRound(game, game.rounds[0].id, {
      isDraw: false,
      winnerId: "b",
      method: "self-draw",
      faan: 3,
    });

    // Same outcomes recorded from scratch with B winning the first hand instead.
    let expected = newGame();
    expected = win(expected, "b"); // deal passes to B
    expected = win(expected, "b", "discard", 5, "a"); // B (now dealer) repeats
    expected = win(expected, "c", "self-draw", 4);
    expected = draw(expected);
    expected = win(expected, "a", "discard", 6, "d");

    expect(winds(edited)).toEqual(winds(expected.rounds));
    expect(getCurrentWind({ ...game, rounds: edited })).toEqual(getCurrentWind(expected));
    expect(computeStandings({ ...game, rounds: edited })).toEqual(computeStandings(expected));
    expect(edited[0].edited).toBe(true);
    expect(edited.slice(1).some((r) => r.edited)).toBe(false);
  });

  it("replays correctly when a hand is changed into a draw", () => {
    const game = sampleGame();
    const edited = withEditedRound(game, game.rounds[1].id, { isDraw: true });
    expect(edited[1].payouts).toEqual([]);
    expect(edited[1].winnerId).toBeUndefined();

    let expected = newGame();
    expected = win(expected, "a");
    expected = draw(expected); // A still deals
    expected = win(expected, "c", "self-draw", 4);
    expected = draw(expected);
    expected = win(expected, "a", "discard", 6, "d");
    expect(winds(edited)).toEqual(winds(expected.rounds));
  });

  it("stops at a manual adjustment, which keeps the state the operator chose", () => {
    let game = newGame();
    game = win(game, "b");
    const chosen = { prevailingWind: 1 as const, dealerIndex: 2, dealerSeatNumber: 3, repeatCount: 0 };
    game = adjust(game, chosen);
    game = win(game, "a");

    const edited = withEditedRound(game, game.rounds[0].id, { isDraw: false, winnerId: "a", method: "self-draw", faan: 3 });
    expect(edited[1].windBefore).toEqual(edited[0].windAfter);
    expect(edited[1].windAfter).toEqual(chosen);
    expect(edited[2].windBefore).toEqual(chosen);
  });

  it("ignores edits to an adjustment", () => {
    let game = newGame();
    game = adjust(game, { prevailingWind: 1, dealerIndex: 0, dealerSeatNumber: 1, repeatCount: 0 });
    expect(withEditedRound(game, game.rounds[0].id, { isDraw: true })).toBe(game.rounds);
  });
});

describe("deleting an early round", () => {
  it("replays the wind for the rounds after it", () => {
    const game = sampleGame();
    const remaining = withDeletedRound(game, game.rounds[0].id);

    let expected = newGame();
    expected = win(expected, "b", "discard", 5, "a"); // deal passes A -> B
    expected = win(expected, "c", "self-draw", 4);
    expected = draw(expected);
    expected = win(expected, "a", "discard", 6, "d");

    expect(remaining).toHaveLength(4);
    expect(winds(remaining)).toEqual(winds(expected.rounds));
    expect(computeStandings({ ...game, rounds: remaining })).toEqual(computeStandings(expected));
  });

  it("returns the rounds unchanged for an unknown id", () => {
    const game = sampleGame();
    expect(withDeletedRound(game, "missing")).toBe(game.rounds);
  });
});

describe("undo", () => {
  it("rolls scores and wind back together, one entry at a time", () => {
    const snapshots: GameState[] = [];
    let game = newGame();
    const steps: ((g: GameState) => GameState)[] = [
      (g) => win(g, dealerOf(g)),
      (g) => win(g, "c", "discard", 7, "a"),
      (g) => draw(g),
      (g) => adjust(g, { prevailingWind: 2, dealerIndex: 1, dealerSeatNumber: 2, repeatCount: 0 }),
      (g) => win(g, "d", "self-draw", 13),
    ];
    for (const step of steps) {
      snapshots.push(game);
      game = step(game);
    }

    while (snapshots.length > 0) {
      const before = snapshots.pop()!;
      game = { ...game, rounds: withUndoneLastRound(game) };
      expect(computeStandings(game)).toEqual(computeStandings(before));
      expect(getCurrentWind(game)).toEqual(getCurrentWind(before));
    }
    expect(game.rounds).toEqual([]);
  });
});
