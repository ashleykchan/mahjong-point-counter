import { useEffect, useState } from "react";
import type { GameState } from "../../types";
import { computeStandings } from "../../lib/scoring";
import { computeGameStats } from "../../lib/stats";
import { settleUp } from "../../lib/settleUp";
import { formatMoney, pointsToMoney } from "../../lib/money";
import { buildGameSummaryText } from "../../lib/gameSummaryText";
import { FixedBottomBar } from "../FixedBottomBar";

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

  const summaryText = buildGameSummaryText(game);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (copyState !== "copied") return;
    const timeout = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [copyState]);

  async function handleCopy() {
    try {
      // Some browser/permission combinations leave this promise pending forever instead of
      // rejecting, so race it against a timeout to guarantee the user always gets feedback.
      await Promise.race([
        navigator.clipboard.writeText(summaryText),
        new Promise((_, reject) => setTimeout(() => reject(new Error("clipboard timed out")), 1500)),
      ]);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ text: summaryText });
    } catch {
      // User cancelled the share sheet, or it failed silently — nothing to do.
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 text-slate-100">
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Copy Summary</h2>
        <textarea
          readOnly
          value={summaryText}
          onFocus={(e) => e.currentTarget.select()}
          rows={Math.min(Math.max(summaryText.split("\n").length, 8), 20)}
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 p-3 font-mono text-xs leading-relaxed text-slate-200"
        />
        {copyState === "failed" && (
          <p className="text-xs text-amber-400">
            Couldn't copy automatically &ndash; tap the text above to select it, then copy manually.
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 rounded-xl bg-emerald-500 p-3 text-sm font-bold text-emerald-950 active:bg-emerald-400"
          >
            {copyState === "copied" ? "Copied!" : "Copy Summary"}
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              className="flex-1 rounded-xl border border-slate-600 p-3 text-sm font-semibold text-slate-200 active:bg-slate-800"
            >
              Share
            </button>
          )}
        </div>
      </section>

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

      <FixedBottomBar className="flex flex-col gap-2">
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
      </FixedBottomBar>
    </div>
  );
}
