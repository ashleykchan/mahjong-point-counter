import { useState } from "react";
import type { GameState, Player, Round } from "../../types";
import { formatCompactMagnitude, pointsToMoney, signOf } from "../../lib/money";
import { WIND_LABELS } from "../../lib/wind";
import { describeCalculation } from "../../lib/faanCalculator";
import { FixedBottomBar } from "../FixedBottomBar";

interface RoundHistoryScreenProps {
  game: GameState;
  onClose: () => void;
  onUndoLast: () => void;
  onEditRound: (roundId: string) => void;
  onDeleteRound: (roundId: string) => void;
  editingMode: boolean;
  onToggleEditingMode: () => void;
  windChangedNotice: boolean;
  onDismissWindChangedNotice: () => void;
}

function nameOfIndex(players: Player[], index: number): string {
  return players[index]?.name ?? "?";
}

function subtitleFor(round: Round, players: Player[], roundNumber: number | null): string {
  const wb = round.windBefore;
  const context = `${WIND_LABELS[wb.prevailingWind]} Round, Hand ${wb.dealerSeatNumber} · Dealer: ${nameOfIndex(players, wb.dealerIndex)}`;
  return round.isAdjustment ? `Adjustment · ${context}` : `Round ${roundNumber} · ${context}`;
}

function mainLineFor(round: Round, nameOf: (id?: string) => string): string {
  if (round.isAdjustment) return "Wind/dealer adjusted";
  if (round.isDraw) return "Draw";
  if (round.falseWinnerId) {
    return `${nameOf(round.falseWinnerId)} false win (詐糊) · paid ${formatCompactMagnitude(round.payouts[0]?.amount ?? 0)} to each player`;
  }
  const winner = nameOf(round.winnerId);
  if (round.method === "self-draw") return `${winner} self-drew · ${round.faan} faan`;
  return `${winner} won off ${nameOf(round.discarderId)}'s discard · ${round.faan} faan`;
}

function adjustmentChangeLines(round: Round, players: Player[]): string[] {
  const wb = round.windBefore;
  const wa = round.windAfter;
  const lines: string[] = [];
  if (wb.dealerIndex !== wa.dealerIndex) {
    lines.push(`Dealer changed from ${nameOfIndex(players, wb.dealerIndex)} to ${nameOfIndex(players, wa.dealerIndex)}`);
  }
  if (wb.prevailingWind !== wa.prevailingWind) {
    lines.push(`Prevailing wind changed from ${WIND_LABELS[wb.prevailingWind]} to ${WIND_LABELS[wa.prevailingWind]}`);
  }
  if (wb.dealerSeatNumber !== wa.dealerSeatNumber) {
    lines.push(`Hand number changed from ${wb.dealerSeatNumber} to ${wa.dealerSeatNumber}`);
  }
  if (wb.repeatCount !== wa.repeatCount) {
    lines.push(`Dealer repeat changed from ${wb.repeatCount} to ${wa.repeatCount}`);
  }
  if (lines.length === 0) lines.push("No change");
  return lines;
}

export function RoundHistoryScreen({
  game,
  onClose,
  onUndoLast,
  onEditRound,
  onDeleteRound,
  editingMode,
  onToggleEditingMode,
  windChangedNotice,
  onDismissWindChangedNotice,
}: RoundHistoryScreenProps) {
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const nameOf = (id?: string) => game.players.find((p) => p.id === id)?.name ?? "?";
  const hasMoney = game.moneyPerPoint > 0;
  const rounds = [...game.rounds].reverse();

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allExpanded = rounds.length > 0 && rounds.every((r) => expandedIds.has(r.id));

  function toggleExpandAll() {
    setExpandedIds(allExpanded ? new Set() : new Set(rounds.map((r) => r.id)));
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-slate-900 p-4 text-slate-100">
      <header className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onClose();
            }}
            className="text-2xl leading-none text-slate-400"
            aria-label="Back"
          >
            &larr;
          </button>
          <h1 className="text-xl font-bold">Round History</h1>
        </div>
        <button
          onClick={onToggleEditingMode}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            editingMode ? "bg-emerald-500 text-emerald-950" : "border border-slate-600 text-slate-200 active:bg-slate-800"
          }`}
        >
          {editingMode ? "Done" : "Edit"}
        </button>
      </header>

      {editingMode && (
        <p className="rounded-xl border border-sky-700 bg-sky-950 p-3 text-sm text-sky-200">Tap a round to edit it.</p>
      )}

      {windChangedNotice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-700 bg-amber-950 p-3 text-sm text-amber-200">
          <span>Dealer and wind updated for later rounds.</span>
          <button onClick={onDismissWindChangedNotice} className="text-lg leading-none text-amber-300" aria-label="Dismiss">
            &times;
          </button>
        </div>
      )}

      {!editingMode && rounds.length > 0 && (
        <button
          onClick={toggleExpandAll}
          className="self-start text-sm font-semibold text-amber-400 underline underline-offset-2"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      )}

      {rounds.length === 0 && <p className="text-center text-slate-400">No rounds recorded yet.</p>}

      <ul className="flex flex-col gap-3">
        {rounds.map((round, i) => {
          const roundNumber = round.isAdjustment ? null : game.rounds.length - i;
          const isConfirmingDelete = confirmingDeleteId === round.id;
          const isExpanded = !editingMode && expandedIds.has(round.id);
          const canEditThisRound = !round.isAdjustment;

          const isFalseWin = Boolean(round.falseWinnerId);
          const gain = round.isDraw || round.isAdjustment || isFalseWin ? 0 : round.payouts.reduce((sum, p) => sum + p.amount, 0);
          const penalty = isFalseWin ? round.payouts.reduce((sum, p) => sum + p.amount, 0) : 0;

          return (
            <li
              key={round.id}
              className={`overflow-hidden rounded-2xl border bg-slate-800 ${
                editingMode ? "border-sky-500" : isFalseWin ? "border-rose-700" : "border-slate-700"
              } ${isFalseWin ? "border-l-4" : ""}`}
            >
              <div className="flex items-stretch">
                {editingMode && (
                  <button
                    onClick={() => setConfirmingDeleteId(round.id)}
                    aria-label="Delete round"
                    className="flex w-14 shrink-0 items-center justify-center text-xl text-rose-400 active:bg-rose-950/40"
                  >
                    &#128465;&#65039;
                  </button>
                )}
                <button
                  onClick={() => {
                    if (editingMode) {
                      if (canEditThisRound) onEditRound(round.id);
                    } else {
                      toggleExpand(round.id);
                    }
                  }}
                  className="flex min-w-0 flex-1 items-start gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                      {subtitleFor(round, game.players, roundNumber)}
                    </p>
                    <p className={`text-lg font-semibold leading-snug ${isFalseWin ? "text-rose-300" : ""}`}>
                      {mainLineFor(round, nameOf)}
                      {round.edited && (
                        <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                          Edited
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {penalty > 0 && (
                      <>
                        <span className="font-bold tabular-nums text-rose-400">
                          &minus;{formatCompactMagnitude(penalty)} pts
                        </span>
                        {hasMoney && (
                          <span className="text-xs tabular-nums text-rose-400/80">
                            &minus;${formatCompactMagnitude(pointsToMoney(penalty, game.moneyPerPoint))}
                          </span>
                        )}
                      </>
                    )}
                    {gain > 0 && (
                      <>
                        <span className="font-bold tabular-nums text-emerald-400">
                          +{formatCompactMagnitude(gain)} pts
                        </span>
                        {hasMoney && (
                          <span className="text-xs tabular-nums text-emerald-400/80">
                            +${formatCompactMagnitude(pointsToMoney(gain, game.moneyPerPoint))}
                          </span>
                        )}
                      </>
                    )}
                    {editingMode ? (
                      canEditThisRound && <span className="text-lg">&#9999;&#65039;</span>
                    ) : (
                      <span
                        className={`text-lg text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      >
                        &#8964;
                      </span>
                    )}
                  </div>
                </button>
              </div>

              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-2 border-t border-slate-700 px-4 pb-4 pt-3">
                    {round.isAdjustment ? (
                      adjustmentChangeLines(round, game.players).map((line, idx) => (
                        <p key={idx} className="text-sm text-slate-300">
                          {line}
                        </p>
                      ))
                    ) : round.isDraw ? (
                      <p className="text-sm text-slate-400">No payouts this round</p>
                    ) : (
                      <>
                        {round.faanCalc && (
                          <p className="text-sm text-slate-300">{describeCalculation(game.ruleSet, round.faanCalc)}</p>
                        )}
                        <ul className="flex flex-col gap-1">
                          {round.payouts.map((p, idx) => (
                            <li key={idx} className="flex items-center justify-between text-sm">
                              <span>
                                <span className="text-rose-400">{nameOf(p.from)}</span>
                                <span className="text-slate-500"> &rarr; </span>
                                <span className="text-emerald-400">{nameOf(p.to)}</span>
                              </span>
                              <span className="tabular-nums text-slate-200">
                                {formatCompactMagnitude(p.amount)} pts
                                {hasMoney && (
                                  <span className="text-slate-400"> &middot; ${formatCompactMagnitude(pointsToMoney(p.amount, game.moneyPerPoint))}</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-1 flex flex-col gap-1 border-t border-slate-700/60 pt-2">
                          {game.players.map((player) => {
                            const net = round.payouts.reduce(
                              (sum, p) => sum + (p.to === player.id ? p.amount : 0) - (p.from === player.id ? p.amount : 0),
                              0,
                            );
                            return (
                              <div key={player.id} className="flex items-center justify-between text-sm text-slate-400">
                                <span>{player.name}</span>
                                <span className="tabular-nums">
                                  {signOf(net)}
                                  {formatCompactMagnitude(net)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isConfirmingDelete && (
                <div className="mx-4 mb-4 flex flex-col gap-2 rounded-xl border border-rose-800 bg-rose-950 p-3">
                  <p className="text-sm text-rose-200">
                    {round.isAdjustment ? "Delete this wind/dealer adjustment?" : "Delete this round?"}
                  </p>
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

      {game.rounds.length > 0 && !editingMode && (
        <FixedBottomBar>
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
        </FixedBottomBar>
      )}
    </div>
  );
}
