import type { GameState, PlayerId } from "../types";
import { computeStandings } from "./scoring";
import { settleUp } from "./settleUp";
import { pointsToMoney, round2 } from "./money";

const PLACE_EMOJIS = ["\u{1F947}", "\u{1F948}", "\u{1F949}", "4️⃣"]; // 🥇 🥈 🥉 4️⃣

function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Whole dollars with no decimals ($25); cents only when the amount isn't a whole number ($12.50). */
function formatMagnitude(n: number): string {
  const rounded = round2(Math.abs(n));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function signOf(n: number): "+" | "-" | "" {
  if (n > 0) return "+";
  if (n < 0) return "-";
  return "";
}

interface NetResult {
  id: PlayerId;
  name: string;
  net: number;
}

function computeNetResults(game: GameState): NetResult[] {
  const standings = computeStandings(game);
  return game.players.map((p) => ({
    id: p.id,
    name: p.name,
    net: round2((standings[p.id] ?? 0) - (game.startingScores[p.id] ?? 0)),
  }));
}

/** Competition ranking: ties share a place, and the next distinct value skips accordingly. */
function ranksWithTies(sortedByNetDesc: NetResult[]): number[] {
  const ranks: number[] = [];
  sortedByNetDesc.forEach((n, i) => {
    ranks.push(i === 0 || n.net !== sortedByNetDesc[i - 1].net ? i : ranks[i - 1]);
  });
  return ranks;
}

function buildLeaderboardLines(game: GameState): string[] {
  const nets = computeNetResults(game).sort((a, b) => b.net - a.net);
  const places = ranksWithTies(nets);
  const hasMoney = game.moneyPerPoint > 0;

  return nets.map((n, i) => {
    const emoji = PLACE_EMOJIS[places[i]] ?? PLACE_EMOJIS[PLACE_EMOJIS.length - 1];
    if (n.net === 0) return `${emoji} ${n.name} · even`;

    const sign = signOf(n.net);
    const parts = [`${sign}${formatMagnitude(n.net)} pts`];
    if (hasMoney) {
      const money = pointsToMoney(n.net, game.moneyPerPoint);
      parts.push(`${sign}$${formatMagnitude(money)}`);
    }
    return `${emoji} ${n.name} · ${parts.join(" · ")}`;
  });
}

function buildPayoutLines(game: GameState): string[] {
  const nets = computeNetResults(game);
  const hasMoney = game.moneyPerPoint > 0;
  const balances = nets.map((n) => ({ id: n.id, amount: hasMoney ? pointsToMoney(n.net, game.moneyPerPoint) : n.net }));
  const settlement = settleUp(balances).sort((a, b) => b.amount - a.amount);

  if (settlement.length === 0) return ["Everyone broke even \u{1F389}"];

  const nameOf = (id: PlayerId) => game.players.find((p) => p.id === id)?.name ?? "?";
  return settlement.map((s) => {
    const amountStr = hasMoney ? `$${formatMagnitude(s.amount)}` : `${formatMagnitude(s.amount)} pts`;
    return `${nameOf(s.from)} → ${nameOf(s.to)}: ${amountStr}`;
  });
}

/** The highest-faan winning hand; on a tie, the most recent one. Null if nobody won a hand. */
function findBiggestHand(game: GameState): { winnerName: string; faan: number } | null {
  let best: { winnerId: PlayerId; faan: number } | null = null;
  for (const round of game.rounds) {
    if (round.isAdjustment || round.isDraw || round.winnerId === undefined || round.faan === undefined) continue;
    if (!best || round.faan >= best.faan) {
      best = { winnerId: round.winnerId, faan: round.faan };
    }
  }
  if (!best) return null;
  const winnerName = game.players.find((p) => p.id === best.winnerId)?.name ?? "?";
  return { winnerName, faan: best.faan };
}

export function buildGameSummaryText(game: GameState): string {
  const handsPlayed = game.rounds.filter((r) => !r.isAdjustment).length;

  const header = [
    `\u{1F004} Mahjong · ${formatDate(game.createdAt)}`,
    `${handsPlayed} hand${handsPlayed === 1 ? "" : "s"} played`,
  ];
  const leaderboard = ["\u{1F3C6} Leaderboard", ...buildLeaderboardLines(game)];
  const payouts = ["\u{1F4B8} Payouts", ...buildPayoutLines(game)];

  const sections = [header, leaderboard, payouts];

  const biggest = findBiggestHand(game);
  if (biggest) {
    sections.push([`⭐ Biggest hand: ${biggest.winnerName}, ${biggest.faan} faan`]);
  }

  return sections.map((block) => block.join("\n")).join("\n\n");
}
