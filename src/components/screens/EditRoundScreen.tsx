import { useState } from "react";
import type { GameState, PlayerId, Round, WinMethod } from "../../types";
import type { RoundEdit } from "../../lib/rounds";
import { withEditedRound } from "../../lib/rounds";
import { computeStandings } from "../../lib/scoring";
import { formatMoney, pointsToMoney } from "../../lib/money";
import { WIND_LABELS } from "../../lib/wind";
import { FaanStepper } from "../FaanStepper";
import { FixedBottomBar } from "../FixedBottomBar";

interface EditRoundScreenProps {
  game: GameState;
  round: Round;
  roundNumber: number;
  onSave: (edit: RoundEdit) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function EditRoundScreen({ game, round, roundNumber, onSave, onCancel, onDelete }: EditRoundScreenProps) {
  const [isDraw, setIsDraw] = useState(round.isDraw);
  const [winnerId, setWinnerId] = useState<PlayerId | null>(round.winnerId ?? null);
  const [method, setMethod] = useState<WinMethod | null>(round.method ?? null);
  const [discarderId, setDiscarderId] = useState<PlayerId | null>(round.discarderId ?? null);
  const [faan, setFaan] = useState(round.faan ?? game.ruleSet.minFaan);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const nameOf = (id?: PlayerId) => game.players.find((p) => p.id === id)?.name ?? "?";
  const dealerName = nameOf(game.players[round.windBefore.dealerIndex]?.id);
  const others = game.players.filter((p) => p.id !== winnerId);

  const isValid = isDraw || (winnerId !== null && method !== null && (method === "self-draw" || discarderId !== null));

  const edit: RoundEdit = isDraw
    ? { isDraw: true }
    : { isDraw: false, winnerId: winnerId!, method: method!, discarderId: discarderId ?? undefined, faan };

  const standingsBefore = computeStandings(game);
  const previewRounds = isValid ? withEditedRound(game, round.id, edit) : null;
  const standingsAfter = previewRounds ? computeStandings({ ...game, rounds: previewRounds }) : null;

  function chooseWinner(id: PlayerId) {
    setWinnerId(id);
    if (discarderId === id) setDiscarderId(null);
  }

  function chooseMethod(m: WinMethod) {
    setMethod(m);
    if (m === "self-draw") setDiscarderId(null);
  }

  if (confirmingDelete) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 text-slate-100">
        <header className="flex items-center gap-3 pt-2">
          <button onClick={() => setConfirmingDelete(false)} className="text-2xl leading-none text-slate-400" aria-label="Back">
            &larr;
          </button>
          <h1 className="text-xl font-bold">Delete Round {roundNumber}?</h1>
        </header>
        <p className="text-sm text-slate-400">
          This removes the round entirely and shifts the dealer/wind for every later round to match. This can't be undone
          from here.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmingDelete(false)}
            className="flex-1 rounded-xl border border-slate-600 p-4 text-lg font-semibold text-slate-300 active:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="flex-1 rounded-xl bg-rose-600 p-4 text-lg font-bold text-rose-50 active:bg-rose-500"
          >
            Delete Round
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 text-slate-100">
      <header className="pt-2">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-2xl leading-none text-slate-400" aria-label="Back">
            &larr;
          </button>
          <h1 className="text-xl font-bold">Edit Round {roundNumber}</h1>
        </div>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
          {WIND_LABELS[round.windBefore.prevailingWind]} &middot; Hand {round.windBefore.dealerSeatNumber} &middot; Dealer{" "}
          {dealerName}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setIsDraw(false)}
          className={`rounded-xl border p-3 text-sm font-semibold ${
            !isDraw ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-300"
          }`}
        >
          Hand Played
        </button>
        <button
          onClick={() => setIsDraw(true)}
          className={`rounded-xl border p-3 text-sm font-semibold ${
            isDraw ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-300"
          }`}
        >
          Draw / No Winner
        </button>
      </section>

      {!isDraw && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Who won?</h2>
            <div className="grid grid-cols-2 gap-3">
              {game.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => chooseWinner(p.id)}
                  className={`rounded-2xl border p-4 text-base font-semibold ${
                    winnerId === p.id
                      ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                      : "border-slate-700 bg-slate-800 active:bg-slate-700"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">How did they win?</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => chooseMethod("self-draw")}
                className={`rounded-2xl border p-4 text-base font-semibold ${
                  method === "self-draw"
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-700 bg-slate-800 active:bg-slate-700"
                }`}
              >
                Self-drawn
              </button>
              <button
                onClick={() => chooseMethod("discard")}
                className={`rounded-2xl border p-4 text-base font-semibold ${
                  method === "discard"
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-700 bg-slate-800 active:bg-slate-700"
                }`}
              >
                Won off discard
              </button>
            </div>
          </section>

          {method === "discard" && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Who discarded?</h2>
              <div className="grid grid-cols-1 gap-3">
                {others.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDiscarderId(p.id)}
                    className={`rounded-2xl border p-4 text-base font-semibold ${
                      discarderId === p.id
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                        : "border-slate-700 bg-slate-800 active:bg-slate-700"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">How many faan?</h2>
            <FaanStepper value={faan} min={game.ruleSet.minFaan} max={game.ruleSet.maxFaan} onChange={setFaan} />
          </section>
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Score change preview</h2>
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
          {standingsAfter ? (
            <ul className="flex flex-col gap-2">
              {game.players.map((p) => {
                const before = standingsBefore[p.id] ?? 0;
                const after = standingsAfter[p.id] ?? 0;
                const changed = before !== after;
                return (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className={changed ? "font-semibold text-slate-200" : "text-slate-400"}>{p.name}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="text-slate-500">{before}</span>
                      <span className="text-slate-600">&rarr;</span>
                      <span className={`font-bold ${changed ? (after > before ? "text-emerald-400" : "text-rose-400") : "text-slate-400"}`}>
                        {after}
                      </span>
                      {game.moneyPerPoint > 0 && (
                        <span className="ml-1 text-xs text-slate-500">
                          ({formatMoney(pointsToMoney(after, game.moneyPerPoint))})
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Pick a winner (and discarder, if applicable) to see the score change.</p>
          )}
        </div>
      </section>

      <button
        onClick={() => setConfirmingDelete(true)}
        className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm font-semibold text-rose-300 active:bg-rose-950"
      >
        Delete Round
      </button>

      <FixedBottomBar className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-600 p-4 text-lg font-semibold text-slate-300 active:bg-slate-800"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(edit)}
          disabled={!isValid}
          className="flex-1 rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400 disabled:opacity-40"
        >
          Save Changes
        </button>
      </FixedBottomBar>
    </div>
  );
}
