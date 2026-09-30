import { describe, expect, it } from "vitest";
import { nextRotation, playerAt, positionOf, TABLE_POSITIONS } from "./seating";
import { newGame, nonDealerOf, win } from "./testGame";
import { getCurrentWind, seatWindLabel } from "./wind";

describe("table seating", () => {
  it("seats players 1-4 bottom, right, top, left (counter-clockwise turn order)", () => {
    expect([0, 1, 2, 3].map((i) => positionOf(i, 0))).toEqual(["bottom", "right", "top", "left"]);
  });

  it("keeps every seat fixed while the dealer and seat winds rotate through a full round", () => {
    let game = newGame();
    const dealerPositions: string[] = [];
    const seatWindsByHand: string[][] = [];

    for (let hand = 0; hand < 16; hand++) {
      const wind = getCurrentWind(game);
      // Seats never move...
      expect(game.players.map((_, i) => positionOf(i, 0))).toEqual(["bottom", "right", "top", "left"]);
      // ...only the dealer marker and seat winds do.
      dealerPositions.push(positionOf(wind.dealerIndex, 0));
      seatWindsByHand.push(game.players.map((_, i) => seatWindLabel(i, wind.dealerIndex)));
      game = win(game, nonDealerOf(game));
    }

    // The deal moves round the table in turn order, four times (once per prevailing wind).
    expect(dealerPositions).toEqual(Array(4).fill(["bottom", "right", "top", "left"]).flat());
    // Whoever deals is East, and the player to their right is South.
    expect(seatWindsByHand.slice(0, 4)).toEqual([
      ["East", "South", "West", "North"],
      ["North", "East", "South", "West"],
      ["West", "North", "East", "South"],
      ["South", "West", "North", "East"],
    ]);
    // After the full East-to-North round the table is back where it started.
    expect(getCurrentWind(game).dealerIndex).toBe(0);
    expect(game.players.map((_, i) => positionOf(i, 0))).toEqual(["bottom", "right", "top", "left"]);
  });

  it("rotating the view only changes which seat is drawn at the bottom", () => {
    let rotation = 0;
    for (let turn = 0; turn < 4; turn++) {
      rotation = nextRotation(rotation);
      const drawn = TABLE_POSITIONS.map((pos) => playerAt(pos, rotation));
      // Every seat is still drawn exactly once...
      expect([...drawn].sort()).toEqual([0, 1, 2, 3]);
      // ...and still in counter-clockwise turn order from the bottom.
      expect(drawn).toEqual([0, 1, 2, 3].map((k) => (rotation + k) % 4));
      for (let i = 0; i < 4; i++) expect(playerAt(positionOf(i, rotation), rotation)).toBe(i);
    }
    expect(rotation).toBe(0);
  });
});
