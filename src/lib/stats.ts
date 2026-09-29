import type { GameState, PlayerId, Round } from "../types";

export interface PlayerStats {
  playerId: PlayerId;
  handsWon: number;
  selfDrawWins: number;
  discardWins: number;
  timesDealtIn: number;
  biggestHandFaan: number | null;
  averageFaanPerWin: number | null;
  timesAsDealer: number;
  /** Times this player declared a false win (詐糊). */
  falseWins: number;
}

export interface GameStats {
  totalHandsPlayed: number;
  totalDraws: number;
  highestFaanHand: { faan: number; winnerId: PlayerId } | null;
  gameLengthMs: number;
  perPlayer: Record<PlayerId, PlayerStats>;
}

function playedRounds(rounds: Round[]): Round[] {
  return rounds.filter((r) => !r.isAdjustment);
}

export function computeGameStats(game: GameState): GameStats {
  const rounds = playedRounds(game.rounds);
  const perPlayer: Record<PlayerId, PlayerStats> = {};
  for (const p of game.players) {
    perPlayer[p.id] = {
      playerId: p.id,
      handsWon: 0,
      selfDrawWins: 0,
      discardWins: 0,
      timesDealtIn: 0,
      biggestHandFaan: null,
      averageFaanPerWin: null,
      timesAsDealer: 0,
      falseWins: 0,
    };
  }

  const faanSums: Record<PlayerId, number> = {};
  let totalDraws = 0;
  let highestFaanHand: { faan: number; winnerId: PlayerId } | null = null;

  for (const round of rounds) {
    const dealerId = game.players[round.windBefore.dealerIndex]?.id;
    if (dealerId && perPlayer[dealerId]) perPlayer[dealerId].timesAsDealer += 1;

    // A false win is a hand played, but never a win or a candidate for the biggest hand.
    if (round.falseWinnerId) {
      if (perPlayer[round.falseWinnerId]) perPlayer[round.falseWinnerId].falseWins += 1;
      continue;
    }

    if (round.isDraw) {
      totalDraws += 1;
      continue;
    }

    if (!round.winnerId || round.faan === undefined) continue;
    const stats = perPlayer[round.winnerId];
    if (!stats) continue;

    stats.handsWon += 1;
    if (round.method === "self-draw") stats.selfDrawWins += 1;
    if (round.method === "discard") stats.discardWins += 1;
    stats.biggestHandFaan = Math.max(stats.biggestHandFaan ?? 0, round.faan);
    faanSums[round.winnerId] = (faanSums[round.winnerId] ?? 0) + round.faan;

    if (round.discarderId && perPlayer[round.discarderId]) {
      perPlayer[round.discarderId].timesDealtIn += 1;
    }

    if (!highestFaanHand || round.faan > highestFaanHand.faan) {
      highestFaanHand = { faan: round.faan, winnerId: round.winnerId };
    }
  }

  for (const p of game.players) {
    const stats = perPlayer[p.id];
    if (stats.handsWon > 0) {
      stats.averageFaanPerWin = Math.round((faanSums[p.id] / stats.handsWon) * 10) / 10;
    }
  }

  return {
    totalHandsPlayed: rounds.length,
    totalDraws,
    highestFaanHand,
    gameLengthMs: (game.endedAt ?? Date.now()) - game.createdAt,
    perPlayer,
  };
}
