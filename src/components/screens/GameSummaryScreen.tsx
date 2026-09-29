import type { GameState } from "../../types";
import { computeStandings } from "../../lib/scoring";
import { computeGameStats } from "../../lib/stats";
import { settleUp } from "../../lib/settleUp";
import { formatMoney, pointsToMoney } from "../../lib/money";

interface GameSummaryScreenProps {
  game: GameState;
  onStartNewGameSamePlayers: () => void;
  onNewGameFromScratch: () => void;
  onOpenHistory: () => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}m`;
}

export function GameSummaryScreen({ game, onStartNewGameSamePlayers, onNewGameFromScratch, onOpenHistory }: GameSummaryScreenProps) {
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";
  const standings = computeStandings(game);
  const stats = computeGameStats(game);
  const hasMoney = game.moneyPerPoint > 0;

  const ranked = [...game.players].sort((a, b) => (standings[b.id] ?? 0) - (standings[a.id] ?? 0));

  const settlement = hasMoney
    ? settleUp(game.players.map((p) => ({ id: p.id, amount: pointsToMoney(standings[p.id] ?? 0, game.moneyPerPoint) })))
    : [];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 pb-28 text-slate-100">
      <header className="flex items-start justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold">Game Summary</h1>
          <p className="text-sm text-slate-400">
            {stats.totalHandsPlayed} hands &middot; {stats.totalDraws} draws &middot; {formatDuration(stats.gameLengthMs)}
          </p>
        </div>
        <button onClick={onOpenHistory} className="text-sm font-semibold text-amber-400 underline underline-offset-2">
          Round History
        </button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Final Standings</h2>
        <ol className="flex flex-col gap-2">
          {ranked.map((p, i) => {
            const points = standings[p.id] ?? 0;
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  i === 0 ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-500">#{i + 1}</span>
                  <span className="font-semibold">{p.name}</span>
                </span>
                <span className="text-right">
                  <span className={`block text-lg font-bold tabular-nums ${points > 0 ? "text-emerald-400" : points < 0 ? "text-rose-400" : "text-slate-300"}`}>
                    {points > 0 ? `+${points}` : points}
                  </span>
                  {hasMoney && (
                    <span className="block text-xs text-slate-400">{formatMoney(pointsToMoney(points, game.moneyPerPoint))}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {hasMoney && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Settle Up</h2>
          {settlement.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-slate-400">
              Everyone's already even.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {settlement.map((s, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <span>
                    <span className="text-rose-400">{nameOf(s.from)}</span> pays{" "}
                    <span className="text-emerald-400">{nameOf(s.to)}</span>
                  </span>
                  <span className="font-bold tabular-nums">{formatMoney(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Player Stats</h2>
        <div className="flex flex-col gap-3">
          {game.players.map((p) => {
            const s = stats.perPlayer[p.id];
            return (
              <div key={p.id} className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                <p className="mb-2 font-semibold">{p.name}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-300">
                  <dt className="text-slate-500">Hands won</dt>
                  <dd className="text-right tabular-nums">{s.handsWon}</dd>
                  <dt className="text-slate-500">Self-drawn</dt>
                  <dd className="text-right tabular-nums">{s.selfDrawWins}</dd>
                  <dt className="text-slate-500">Off discard</dt>
                  <dd className="text-right tabular-nums">{s.discardWins}</dd>
                  <dt className="text-slate-500">Dealt in</dt>
                  <dd className="text-right tabular-nums">{s.timesDealtIn}</dd>
                  <dt className="text-slate-500">Biggest hand</dt>
                  <dd className="text-right tabular-nums">{s.biggestHandFaan ?? "–"}</dd>
                  <dt className="text-slate-500">Avg faan/win</dt>
                  <dd className="text-right tabular-nums">{s.averageFaanPerWin ?? "–"}</dd>
                  <dt className="text-slate-500">Times as dealer</dt>
                  <dd className="text-right tabular-nums">{s.timesAsDealer}</dd>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      {stats.highestFaanHand && (
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm">
          <span className="text-slate-400">Highest hand of the game: </span>
          <span className="font-semibold">
            {nameOf(stats.highestFaanHand.winnerId)} with {stats.highestFaanHand.faan} faan
          </span>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-2 border-t border-slate-800 bg-slate-900 p-4">
        <button
          onClick={onStartNewGameSamePlayers}
          className="w-full rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400"
        >
          Start New Game (same players)
        </button>
        <button
          onClick={onNewGameFromScratch}
          className="w-full rounded-xl border border-slate-600 p-3 text-base font-semibold text-slate-300 active:bg-slate-800"
        >
          New Game from Scratch
        </button>
      </div>
    </div>
  );
}
