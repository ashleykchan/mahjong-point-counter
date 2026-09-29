import type { GameState, Payout, Player, PlayerId, Round, RuleSet, WinMethod } from "../types";

export function pointsForFaan(ruleSet: RuleSet, faan: number): number {
  const clamped = Math.min(Math.max(faan, ruleSet.minFaan), ruleSet.maxFaan);
  return ruleSet.faanTable[clamped] ?? 0;
}

export function computePayouts(
  ruleSet: RuleSet,
  players: Player[],
  winnerId: PlayerId,
  method: WinMethod,
  faan: number,
  discarderId?: PlayerId,
): Payout[] {
  const base = pointsForFaan(ruleSet, faan);

  if (method === "self-draw") {
    const amount = base * ruleSet.selfDrawMultiplier;
    return players
      .filter((p) => p.id !== winnerId)
      .map((p) => ({ from: p.id, to: winnerId, amount }));
  }

  if (!discarderId) return [];
  const amount = base * ruleSet.dealInMultiplier;
  return [{ from: discarderId, to: winnerId, amount }];
}

export const DEFAULT_FALSE_WIN_FLAT_POINTS = 8;

/** Points a false winner pays each other player under this rule set. */
export function falseWinPenaltyEach(ruleSet: RuleSet): number {
  switch (ruleSet.falseWinPenalty ?? "min-self-draw") {
    case "max-self-draw":
      return pointsForFaan(ruleSet, ruleSet.maxFaan) * ruleSet.selfDrawMultiplier;
    case "flat":
      return ruleSet.falseWinFlatPoints ?? DEFAULT_FALSE_WIN_FLAT_POINTS;
    default:
      return pointsForFaan(ruleSet, ruleSet.minFaan) * ruleSet.selfDrawMultiplier;
  }
}

/** A false winner (詐糊) pays every other player the rule set's penalty. */
export function computeFalseWinPayouts(ruleSet: RuleSet, players: Player[], falseWinnerId: PlayerId): Payout[] {
  const amount = falseWinPenaltyEach(ruleSet);
  return players.filter((p) => p.id !== falseWinnerId).map((p) => ({ from: falseWinnerId, to: p.id, amount }));
}

export function computeStandings(game: GameState): Record<PlayerId, number> {
  const totals: Record<PlayerId, number> = { ...game.startingScores };
  for (const round of game.rounds) {
    for (const payout of round.payouts) {
      totals[payout.from] = (totals[payout.from] ?? 0) - payout.amount;
      totals[payout.to] = (totals[payout.to] ?? 0) + payout.amount;
    }
  }
  return totals;
}

export function describeRound(round: Round, players: Player[]): string {
  const nameOf = (id?: PlayerId) => players.find((p) => p.id === id)?.name ?? "?";
  if (round.isAdjustment) return "Wind/dealer manually adjusted";
  if (round.isDraw) return "Draw – no score change";
  if (round.falseWinnerId) return `${nameOf(round.falseWinnerId)} false win (詐糊)`;
  const winner = nameOf(round.winnerId);
  if (round.method === "self-draw") {
    return `${winner} self-drew (${round.faan} faan)`;
  }
  return `${winner} won off ${nameOf(round.discarderId)}'s discard (${round.faan} faan)`;
}
