import { describe, expect, it } from "vitest";
import type { GameState, WindState } from "../types";
import { completedFullCycle, getCurrentWind, initialWindState } from "./wind";
import { adjust, dealerOf, draw, newGame, nonDealerOf, win } from "./testGame";

const w = (prevailingWind: 0 | 1 | 2 | 3, dealerIndex: number, dealerSeatNumber: number, repeatCount = 0): WindState => ({
  prevailingWind,
  dealerIndex,
  dealerSeatNumber,
  repeatCount,
});

describe("wind and dealer rotation", () => {
  it("starts East round, hand 1, with the first player dealing", () => {
    expect(getCurrentWind(newGame())).toEqual(initialWindState());
    expect(initialWindState()).toEqual(w(0, 0, 1));
  });

  it("walks a full East-to-North cycle when every hand passes the deal", () => {
    let game = newGame();
    const seen: WindState[] = [];
    for (let hand = 0; hand < 16; hand++) {
      seen.push(getCurrentWind(game));
      game = win(game, nonDealerOf(game));
    }
    // Four hands per prevailing wind, with the deal moving round the table each hand.
    expect(seen).toEqual(
      ([0, 1, 2, 3] as const).flatMap((wind) => [0, 1, 2, 3].map((seat) => w(wind, seat, seat + 1))),
    );
    // The 16th hand wraps back to East and is flagged as completing the cycle; none before it are.
    expect(getCurrentWind(game)).toEqual(w(0, 0, 1));
    expect(game.rounds.map(completedFullCycle)).toEqual([...Array(15).fill(false), true]);
  });

  it("keeps the dealer and counts repeats when the dealer wins", () => {
    let game = newGame();
    game = win(game, dealerOf(game));
    game = win(game, dealerOf(game), "discard", 5, "c");
    expect(getCurrentWind(game)).toEqual(w(0, 0, 1, 2));
    // A non-dealer win then passes the deal and resets the repeat count.
    game = win(game, nonDealerOf(game));
    expect(getCurrentWind(game)).toEqual(w(0, 1, 2, 0));
  });

  it("counts dealer repeats in the cycle without advancing the hand number", () => {
    let game = newGame();
    for (let hand = 0; hand < 16; hand++) {
      game = win(game, dealerOf(game)); // repeat once...
      game = win(game, nonDealerOf(game)); // ...then pass
    }
    expect(game.rounds).toHaveLength(32);
    expect(getCurrentWind(game)).toEqual(w(0, 0, 1));
    expect(game.rounds.filter(completedFullCycle)).toHaveLength(1);
  });

  it("keeps the dealer on a draw when the rule set says the dealer stays", () => {
    let game = newGame({ dealerStaysOnDraw: true });
    game = draw(game);
    game = draw(game);
    expect(getCurrentWind(game)).toEqual(w(0, 0, 1, 2));
  });

  it("passes the deal on a draw when the rule set says the dealer passes", () => {
    let game = newGame({ dealerStaysOnDraw: false });
    game = draw(game);
    expect(getCurrentWind(game)).toEqual(w(0, 1, 2, 0));
    // A draw on the 4th hand of a wind moves the prevailing wind on, like any other pass.
    game = draw(draw(draw(game)));
    expect(getCurrentWind(game)).toEqual(w(1, 0, 1, 0));
  });

  it("clears a pending dealer repeat when a draw passes the deal", () => {
    let game = newGame({ dealerStaysOnDraw: false });
    game = win(game, dealerOf(game));
    game = draw(game);
    expect(getCurrentWind(game)).toEqual(w(0, 1, 2, 0));
  });

  it("continues from a manual adjustment", () => {
    let game: GameState = newGame();
    game = win(game, nonDealerOf(game));
    game = adjust(game, w(2, 3, 4, 1));
    expect(getCurrentWind(game)).toEqual(w(2, 3, 4, 1));
    // The adjustment's windBefore records what it replaced.
    expect(game.rounds[1].windBefore).toEqual(w(0, 1, 2));
    // North-seat dealer on hand 4 of West passing the deal moves on to North round, hand 1.
    game = win(game, nonDealerOf(game));
    expect(getCurrentWind(game)).toEqual(w(3, 0, 1, 0));
  });
});
