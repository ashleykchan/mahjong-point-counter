import { useState } from "react";
import type { GameState, PlayerId } from "../../types";
import { computeFalseWinPayouts } from "../../lib/scoring";
import { formatMoney, pointsToMoney } from "../../lib/money";
import { getCurrentWind } from "../../lib/wind";
import { FixedBottomBar } from "../FixedBottomBar";
import { SeatPicker } from "../SeatPicker";

interface FalseWinScreenProps {
  game: GameState;
  onConfirm: (falseWinnerId: PlayerId) => void;
  onCancel: () => void;
}

export function FalseWinScreen({ game, onConfirm, onCancel }: FalseWinScreenProps) {
  const [falseWinnerId, setFalseWinnerId] = useState<PlayerId | null>(null);
  const nameOf = (id: PlayerId) => game.players.find((p) => p.id === id)?.name ?? "?";
  const payouts = falseWinnerId ? computeFalseWinPayouts(game.ruleSet, game.players, falseWinnerId) : [];
  const total = payouts.reduce((sum, p) => sum + p.amount, 0);
  const dealerName = nameOf(game.players[getCurrentWind(game).dealerIndex]?.id);
  const dealerStays = game.ruleSet.dealerStaysOnFalseWin ?? true;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 text-slate-100">
      <header className="flex items-center gap-3 pt-2">
        <button
          onClick={() => (falseWinnerId ? setFalseWinnerId(null) : onCancel())}
          className="text-2xl leading-none text-slate-400"
          aria-label="Back"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold">
          False Win <span className="font-normal text-slate-400">詐糊</span>
        </h1>
      </header>

      {!falseWinnerId ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Who declared the false win?</h2>
          <p className="text-sm text-slate-500">
            A player who declares a win under the minimum faan, or with an invalid hand, pays every other player.
          </p>
          <SeatPicker gameId={game.id} players={game.players} wind={getCurrentWind(game)} tone="rose" onPick={setFalseWinnerId} />
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Confirm payouts</h2>
          <div className="rounded-2xl border border-rose-800 bg-slate-800 p-4">
            <p className="mb-3 text-lg font-semibold text-rose-300">
              {nameOf(falseWinnerId)} false win &middot; pays {payouts[0]?.amount ?? 0} to each player
            </p>
            <ul className="flex flex-col gap-2">
              {payouts.map((p) => (
                <li key={p.to} className="flex items-center justify-between text-base">
                  <span className="text-rose-400">{nameOf(p.from)}</span>
                  <span className="text-slate-500">pays</span>
                  <span className="text-emerald-400">{nameOf(p.to)}</span>
                  <span className="text-right">
                    <span className="block font-bold tabular-nums">{p.amount} pts</span>
                    {game.moneyPerPoint > 0 && (
                      <span className="block text-xs text-slate-400">{formatMoney(pointsToMoney(p.amount, game.moneyPerPoint))}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-slate-700 pt-3 text-sm text-slate-400">
              {total} pts in total. {dealerStays ? `${dealerName} stays dealer.` : "The deal passes to the next player."}
            </p>
          </div>

          <FixedBottomBar className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-600 p-4 text-lg font-semibold text-slate-300 active:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(falseWinnerId)}
              className="flex-1 rounded-xl bg-rose-600 p-4 text-lg font-bold text-rose-50 active:bg-rose-500"
            >
              Confirm
            </button>
          </FixedBottomBar>
        </section>
      )}
    </div>
  );
}
