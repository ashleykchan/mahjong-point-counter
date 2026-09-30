import type { WindIndex } from "../types";

/** Where a seat is drawn around the table, as seen by whoever is holding the phone. */
export type TablePosition = "bottom" | "right" | "top" | "left";

/**
 * Positions in turn order. Play runs counter-clockwise, so with seat 1 at the bottom, seat 2 sits on the
 * right, seat 3 across (top) and seat 4 on the left.
 */
export const TABLE_POSITIONS: TablePosition[] = ["bottom", "right", "top", "left"];

export const SEATS = 4;

/**
 * The on-screen position of the player at `playerIndex`. `rotation` is which seat is shown at the bottom;
 * it only changes the view, never the seats themselves or the turn order.
 */
export function positionOf(playerIndex: number, rotation: number): TablePosition {
  return TABLE_POSITIONS[(((playerIndex - rotation) % SEATS) + SEATS) % SEATS];
}

/** The player index drawn at an on-screen position. */
export function playerAt(position: TablePosition, rotation: number): number {
  return (TABLE_POSITIONS.indexOf(position) + rotation) % SEATS;
}

/** Rotating puts the next seat in turn order at the bottom. */
export function nextRotation(rotation: number): number {
  return (rotation + 1) % SEATS;
}

export const WIND_CHARACTERS: Record<WindIndex, string> = {
  0: "東",
  1: "南",
  2: "西",
  3: "北",
};

/** Seat labels on New Game setup, in seat order. */
export const SEAT_LABELS = ["Seat 1 (you)", "Right", "Across", "Left"];
