import { useState } from "react";
import type { GameState } from "../../types";
import { describeRound } from "../../lib/scoring";
import { formatMoney, pointsToMoney } from "../../lib/money";
import { WIND_LABELS } from "../../lib/wind";

interface RoundHistoryScreenProps {
  game: GameState;
  onClose: () => void;
  onUndoLast: () => void;
  onEditRound: (roundId: string) => void;
  onDeleteRound: (roundId: string) => void;
  windChangedNotice: boolean;
  onDismissWindChangedNotice: () => void;
}

export function RoundHistoryScreen({
  game,
  onClose,
  onUndoLast,
  onEditRound,
  onDeleteRound,
  windChangedNotice,
  onDismissWindChangedNotice,
}: RoundHistoryScreenProps) {
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";
  const rounds = [...game.rounds].reverse();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-slate-900 p-4 pb-28 text-slate-100">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={onClose} className="text-2xl leading-none text-slate-400" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-xl font-bold">Round History</h1>
      </header>

      {windChangedNotice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-700 bg-amber-950 p-3 text-sm text-amber-200">
          <span>Dealer and wind updated for later rounds.</span>
          <button onClick={onDismissWindChangedNotice} className="text-lg leading-none text-amber-300" aria-label="Dismiss">
            &times;
          </button>
        </div>
      )}

      {rounds.length === 0 && <p className="text-center text-slate-400">No rounds recorded yet.</p>}

      <ul className="flex flex-col gap-3">
        {rounds.map((round, i) => {
          const dealerName = nameOf(game.players[round.windBefore.dealerIndex]?.id ?? "");
          const windLabel = `${WIND_LABELS[round.windBefore.prevailingWind]} · Hand ${round.windBefore.dealerSeatNumber} · Dealer ${dealerName}`;
          const roundNumber = game.rounds.length - i;
          const isConfirmingDelete = confirmingDeleteId === round.id;

          return (
            <li key={round.id} className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{round.isAdjustment ? "Adjustment" : `Round ${roundNumber}`}</span>
                    <span>{new Date(round.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">{windLabel}</p>
                  <p className="text-base font-medium">
                    {describeRound(round, game.players)}
                    {round.edited && (
                      <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                        Edited
                      </span>
                    )}
                  </p>
                </div>

                {round.isAdjustment ? (
                  <button
                    onClick={() => setConfirmingDeleteId(round.id)}
                    className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-rose-800 bg-rose-950/40 px-3 text-sm font-semibold text-rose-300 active:bg-rose-950"
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() => onEditRound(round.id)}
                    className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-700/50 px-3 text-sm font-semibold text-slate-200 active:bg-slate-700"
                  >
                    Edit
                  </button>
                )}
              </div>

              {round.payouts.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {round.payouts.map((p, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-rose-400">{nameOf(p.from)}</span>
                      <span className="text-slate-500">&rarr;</span>
                      <span className="text-emerald-400">{nameOf(p.to)}</span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums">{p.amount} pts</span>
                        {game.moneyPerPoint > 0 && (
                          <span className="block text-xs text-slate-500">{formatMoney(pointsToMoney(p.amount, game.moneyPerPoint))}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {isConfirmingDelete && (
                <div className="mt-3 flex flex-col gap-2 rounded-xl border border-rose-800 bg-rose-950 p-3">
                  <p className="text-sm text-rose-200">Delete this wind/dealer adjustment?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingDeleteId(null)}
                      className="flex-1 rounded-lg border border-slate-600 p-2 text-sm font-semibold text-slate-300 active:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onDeleteRound(round.id);
                        setConfirmingDeleteId(null);
                      }}
                      className="flex-1 rounded-lg bg-rose-600 p-2 text-sm font-bold text-rose-50 active:bg-rose-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {game.rounds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-slate-800 bg-slate-900 p-4">
          {confirmingUndo ? (
            <div className="flex flex-col gap-2 rounded-xl border border-rose-800 bg-rose-950 p-3">
              <p className="text-sm text-rose-200">Undo the most recent entry (hand, draw, or adjustment)?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingUndo(false)}
                  className="flex-1 rounded-lg border border-slate-600 p-2 text-sm font-semibold text-slate-300 active:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUndoLast();
                    setConfirmingUndo(false);
                  }}
                  className="flex-1 rounded-lg bg-rose-600 p-2 text-sm font-bold text-rose-50 active:bg-rose-500"
                >
                  Undo
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingUndo(true)}
              className="w-full rounded-xl border border-rose-800 bg-rose-950 p-3 text-base font-semibold text-rose-300 active:bg-rose-900"
            >
              Undo Last Entry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
