// Test helpers: builds games the same way GameContext records rounds, without React.
import type { GameState, Player, PlayerId, Round, WindState, WinMethod } from "../types";
import { defaultRuleSet } from "./defaultRules";
import { computeFalseWinPayouts, computePayouts } from "./scoring";
import { getCurrentWind, nextWindState, outcomeOf } from "./wind";

export const PLAYERS: Player[] = ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() }));

let nextId = 0;

export function newGame(opts: { dealerStaysOnDraw?: boolean; startingScores?: Record<PlayerId, number> } = {}): GameState {
  return {
    id: "g",
    createdAt: 0,
    players: PLAYERS,
    startingScores: opts.startingScores ?? { a: 0, b: 0, c: 0, d: 0 },
    ruleSet: { ...defaultRuleSet(), dealerStaysOnDraw: opts.dealerStaysOnDraw ?? true },
    moneyPerPoint: 0.5,
    rounds: [],
  };
}

function append(game: GameState, round: Omit<Round, "id" | "timestamp" | "windBefore" | "windAfter">, windAfter?: WindState) {
  const windBefore = getCurrentWind(game);
  const after =
    windAfter ??
    nextWindState(windBefore, game.players, outcomeOf(round), game.ruleSet);
  return {
    ...game,
    rounds: [...game.rounds, { ...round, id: `r${nextId++}`, timestamp: 0, windBefore, windAfter: after }],
  };
}

export function win(
  game: GameState,
  winnerId: PlayerId,
  method: WinMethod = "self-draw",
  faan = 3,
  discarderId?: PlayerId,
): GameState {
  const payouts = computePayouts(game.ruleSet, game.players, winnerId, method, faan, discarderId);
  return append(game, { isDraw: false, winnerId, method, faan, discarderId, payouts });
}

export function falseWin(game: GameState, falseWinnerId: PlayerId): GameState {
  return append(game, {
    isDraw: false,
    falseWinnerId,
    payouts: computeFalseWinPayouts(game.ruleSet, game.players, falseWinnerId),
  });
}

export function draw(game: GameState): GameState {
  return append(game, { isDraw: true, payouts: [] });
}

export function adjust(game: GameState, windAfter: WindState): GameState {
  return append(game, { isDraw: false, isAdjustment: true, payouts: [] }, windAfter);
}

/** The id of whoever deals the next hand. */
export function dealerOf(game: GameState): PlayerId {
  return game.players[getCurrentWind(game).dealerIndex].id;
}

/** A player other than the current dealer, so their win passes the deal. */
export function nonDealerOf(game: GameState): PlayerId {
  return game.players[(getCurrentWind(game).dealerIndex + 1) % game.players.length].id;
}
