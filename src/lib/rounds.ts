import type { FaanSelection, GameState, PlayerId, Round, WinMethod } from "../types";
import { computePayouts } from "./scoring";
import { replayWindForward } from "./wind";

export interface RoundEdit {
  isDraw: boolean;
  winnerId?: PlayerId;
  method?: WinMethod;
  discarderId?: PlayerId;
  faan?: number;
  /** Calculator inputs behind `faan`; omitted when faan was entered manually. */
  faanCalc?: FaanSelection;
}

/** Pure: returns the game's rounds with one round's outcome replaced and wind replayed forward from it. */
export function withEditedRound(game: GameState, roundId: string, edit: RoundEdit): Round[] {
  const index = game.rounds.findIndex((r) => r.id === roundId);
  const original = game.rounds[index];
  if (!original || original.isAdjustment) return game.rounds;

  const payouts = edit.isDraw
    ? []
    : computePayouts(game.ruleSet, game.players, edit.winnerId!, edit.method!, edit.faan!, edit.discarderId);

  const updated: Round = {
    ...original,
    isDraw: edit.isDraw,
    winnerId: edit.isDraw ? undefined : edit.winnerId,
    method: edit.isDraw ? undefined : edit.method,
    discarderId: edit.isDraw ? undefined : edit.discarderId,
    faan: edit.isDraw ? undefined : edit.faan,
    faanCalc: edit.isDraw ? undefined : edit.faanCalc,
    payouts,
    edited: true,
  };

  const rounds = game.rounds.slice();
  rounds[index] = updated;
  return replayWindForward(rounds, index, game.players, game.ruleSet.dealerStaysOnDraw);
}

/** Pure: returns the game's rounds with one round removed and wind replayed forward from that point. */
export function withDeletedRound(game: GameState, roundId: string): Round[] {
  const index = game.rounds.findIndex((r) => r.id === roundId);
  if (index === -1) return game.rounds;

  const rounds = game.rounds.slice();
  rounds.splice(index, 1);
  return replayWindForward(rounds, index, game.players, game.ruleSet.dealerStaysOnDraw);
}

/** Pure: returns the game's rounds without the most recent entry. Scores and wind are both derived from the rounds, so they roll back together. */
export function withUndoneLastRound(game: GameState): Round[] {
  return game.rounds.slice(0, -1);
}
