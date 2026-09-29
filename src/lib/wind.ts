import type { GameState, Player, PlayerId, Round, WindIndex, WindState } from "../types";

export const WIND_LABELS: Record<WindIndex, string> = {
  0: "East",
  1: "South",
  2: "West",
  3: "North",
};

export const SEATS_PER_WIND = 4;

export function initialWindState(): WindState {
  return { prevailingWind: 0, dealerIndex: 0, dealerSeatNumber: 1, repeatCount: 0 };
}

/** The seat wind (0=East..3=North) for a player at a given table index, relative to the current dealer. */
export function seatWindIndex(playerIndex: number, dealerIndex: number): WindIndex {
  return (((playerIndex - dealerIndex) % 4) + 4) % 4 as WindIndex;
}

export function seatWindLabel(playerIndex: number, dealerIndex: number): string {
  return WIND_LABELS[seatWindIndex(playerIndex, dealerIndex)];
}

/** The wind state currently in effect, derived from the last round's snapshot (or the initial state). */
export function getCurrentWind(game: GameState): WindState {
  const last = game.rounds[game.rounds.length - 1];
  return last ? last.windAfter : initialWindState();
}

interface HandOutcome {
  isDraw: boolean;
  winnerId?: PlayerId;
}

/** Pure transition: given the wind state a hand was played under, what state results from its outcome. */
export function nextWindState(
  current: WindState,
  players: Player[],
  outcome: HandOutcome,
  dealerStaysOnDraw: boolean,
): WindState {
  const dealerId = players[current.dealerIndex]?.id;
  const winnerIsDealer = !outcome.isDraw && outcome.winnerId === dealerId;
  const dealerStays = winnerIsDealer || (outcome.isDraw && dealerStaysOnDraw);

  if (dealerStays) {
    return { ...current, repeatCount: current.repeatCount + 1 };
  }

  const completedWind = current.dealerSeatNumber >= SEATS_PER_WIND;
  return {
    prevailingWind: (completedWind ? ((current.prevailingWind + 1) % 4) : current.prevailingWind) as WindIndex,
    dealerIndex: (current.dealerIndex + 1) % players.length,
    dealerSeatNumber: completedWind ? 1 : current.dealerSeatNumber + 1,
    repeatCount: 0,
  };
}

/**
 * Recompute windBefore/windAfter for `rounds[fromIndex..]`, given that everything before
 * `fromIndex` is already correct. Used after editing or deleting a round, since a change to
 * one round's outcome can shift the dealer/wind for every round that follows it.
 *
 * Adjustment rounds are manual overrides: their windBefore is corrected like any other round,
 * but their windAfter (the operator's chosen state) is left untouched, and replay continues
 * from that state.
 */
export function replayWindForward(
  rounds: Round[],
  fromIndex: number,
  players: Player[],
  dealerStaysOnDraw: boolean,
): Round[] {
  if (fromIndex >= rounds.length) return rounds;
  const result = rounds.slice();
  let currentWind = fromIndex === 0 ? initialWindState() : result[fromIndex - 1].windAfter;
  for (let i = fromIndex; i < result.length; i++) {
    const round = result[i];
    const windBefore = currentWind;
    const windAfter = round.isAdjustment
      ? round.windAfter
      : nextWindState(windBefore, players, { isDraw: round.isDraw, winnerId: round.winnerId }, dealerStaysOnDraw);
    result[i] = { ...round, windBefore, windAfter };
    currentWind = windAfter;
  }
  return result;
}

/** True if this round's outcome just completed a full East-South-West-North cycle. */
export function completedFullCycle(round: Pick<Round, "windBefore" | "windAfter">): boolean {
  return round.windBefore.prevailingWind === 3 && round.windAfter.prevailingWind === 0;
}

export function windBannerText(wind: WindState, players: Player[]): { title: string; dealer: string; repeat?: string } {
  const dealerName = players[wind.dealerIndex]?.name ?? "?";
  return {
    title: `${WIND_LABELS[wind.prevailingWind]} Round, Hand ${wind.dealerSeatNumber} of ${SEATS_PER_WIND}`,
    dealer: dealerName,
    repeat: wind.repeatCount > 0 ? `Dealer repeat ×${wind.repeatCount}` : undefined,
  };
}
