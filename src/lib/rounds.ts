import type { FaanSelection, GameState, PlayerId, Round, WinMethod } from "../types";
import { computeFalseWinPayouts, computePayouts } from "./scoring";
import { replayWindForward } from "./wind";

export interface RoundEdit {
  isDraw: boolean;
  winnerId?: PlayerId;
  method?: WinMethod;
  discarderId?: PlayerId;
  /** Set (with isDraw false) to make the round a false win by this player. */
  falseWinnerId?: PlayerId;
  faan?: number;
  /** Calculator inputs behind `faan`; omitted when faan was entered manually. */
  faanCalc?: FaanSelection;
}

/** Pure: returns the game's rounds with one round's outcome replaced and wind replayed forward from it. */
export function withEditedRound(game: GameState, roundId: string, edit: RoundEdit): Round[] {
  const index = game.rounds.findIndex((r) => r.id === roundId);
  const original = game.rounds[index];
  if (!original || original.isAdjustment) return game.rounds;

  const isFalseWin = !edit.isDraw && edit.falseWinnerId !== undefined;
  const isWin = !edit.isDraw && !isFalseWin;
  const payouts = isFalseWin
    ? computeFalseWinPayouts(game.ruleSet, game.players, edit.falseWinnerId!)
    : isWin
      ? computePayouts(game.ruleSet, game.players, edit.winnerId!, edit.method!, edit.faan!, edit.discarderId)
      : [];

  const updated: Round = {
    ...original,
    isDraw: edit.isDraw,
    winnerId: isWin ? edit.winnerId : undefined,
    method: isWin ? edit.method : undefined,
    discarderId: isWin ? edit.discarderId : undefined,
    falseWinnerId: isFalseWin ? edit.falseWinnerId : undefined,
    faan: isWin ? edit.faan : undefined,
    faanCalc: isWin ? edit.faanCalc : undefined,
    payouts,
    edited: true,
  };

  const rounds = game.rounds.slice();
  rounds[index] = updated;
  return replayWindForward(rounds, index, game.players, game.ruleSet);
}

/** Pure: returns the game's rounds with one round removed and wind replayed forward from that point. */
export function withDeletedRound(game: GameState, roundId: string): Round[] {
  const index = game.rounds.findIndex((r) => r.id === roundId);
  if (index === -1) return game.rounds;

  const rounds = game.rounds.slice();
  rounds.splice(index, 1);
  return replayWindForward(rounds, index, game.players, game.ruleSet);
}

/** Pure: returns the game's rounds without the most recent entry. Scores and wind are both derived from the rounds, so they roll back together. */
export function withUndoneLastRound(game: GameState): Round[] {
  return game.rounds.slice(0, -1);
}
