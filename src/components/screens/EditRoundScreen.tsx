import { useState } from "react";
import type { FaanSelection, GameState, PlayerId, Round, WinMethod } from "../../types";
import type { RoundEdit } from "../../lib/rounds";
import { withEditedRound } from "../../lib/rounds";
import { computeStandings, falseWinPenaltyEach } from "../../lib/scoring";
import { formatMoney, pointsToMoney } from "../../lib/money";
import { WIND_LABELS } from "../../lib/wind";
import { FaanStepper } from "../FaanStepper";
import { FixedBottomBar } from "../FixedBottomBar";
import { SeatPicker } from "../SeatPicker";
import { FaanCalculatorTable, FaanModeToggle, FaanTotalFooter } from "../FaanCalculator";
import {
  applyWinMethod,
  calculateFaan,
  initialFaanInput,
  patternsFor,
  type FaanInputMode,
} from "../../lib/faanCalculator";
import { loadFaanInputMode, saveFaanInputMode } from "../../lib/storage";

type RoundResult = "win" | "falseWin" | "draw";

const RESULT_OPTIONS: { value: RoundResult; label: string }[] = [
  { value: "win", label: "Hand Played" },
  { value: "falseWin", label: "False Win 詐糊" },
  { value: "draw", label: "Draw / No Winner" },
];

interface EditRoundScreenProps {
  game: GameState;
  round: Round;
  roundNumber: number;
  onSave: (edit: RoundEdit) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function EditRoundScreen({ game, round, roundNumber, onSave, onCancel, onDelete }: EditRoundScreenProps) {
  const [result, setResult] = useState<RoundResult>(round.isDraw ? "draw" : round.falseWinnerId ? "falseWin" : "win");
  const [falseWinnerId, setFalseWinnerId] = useState<PlayerId | null>(round.falseWinnerId ?? null);
  const [winnerId, setWinnerId] = useState<PlayerId | null>(round.winnerId ?? null);
  const [method, setMethod] = useState<WinMethod | null>(round.method ?? null);
  const [discarderId, setDiscarderId] = useState<PlayerId | null>(round.discarderId ?? null);
  const [faan, setFaan] = useState(round.faan ?? game.ruleSet.minFaan);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [initialFaan] = useState(() => initialFaanInput(round, loadFaanInputMode()));
  const [faanMode, setFaanMode] = useState<FaanInputMode>(initialFaan.mode);
  const [selection, setSelection] = useState<FaanSelection>(() =>
    applyWinMethod(patternsFor(game.ruleSet), initialFaan.selection, round.method ?? null),
  );

  const { minFaan, maxFaan } = game.ruleSet;
  const calc = calculateFaan(game.ruleSet, selection);
  const isAutomatic = faanMode === "automatic";

  function changeFaanMode(mode: FaanInputMode) {
    // Carry the calculated total over so switching to Manual starts from what was worked out.
    if (mode === "manual" && isAutomatic) setFaan(Math.min(Math.max(calc.total, minFaan), maxFaan));
    setFaanMode(mode);
    saveFaanInputMode(mode);
  }

  const nameOf = (id?: PlayerId) => game.players.find((p) => p.id === id)?.name ?? "?";
  const dealerName = nameOf(game.players[round.windBefore.dealerIndex]?.id);

  const isValid =
    result === "draw" ||
    (result === "falseWin" && falseWinnerId !== null) ||
    (result === "win" &&
      winnerId !== null &&
      method !== null &&
      (method === "self-draw" || discarderId !== null) &&
      !(isAutomatic && calc.belowMin));

  const edit: RoundEdit =
    result === "draw"
      ? { isDraw: true }
      : result === "falseWin"
        ? { isDraw: false, falseWinnerId: falseWinnerId ?? undefined }
        : {
            isDraw: false,
            winnerId: winnerId!,
            method: method!,
            discarderId: discarderId ?? undefined,
            faan: isAutomatic ? calc.total : faan,
            faanCalc: isAutomatic ? selection : undefined,
          };

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
    setSelection((prev) => applyWinMethod(patternsFor(game.ruleSet), prev, m));
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

      <section className="grid grid-cols-3 gap-2">
        {RESULT_OPTIONS.map((o) => {
          const selected = result === o.value;
          const selectedClass =
            o.value === "falseWin"
              ? "border-rose-400 bg-rose-400/10 text-rose-300"
              : "border-emerald-400 bg-emerald-400/10 text-emerald-300";
          return (
            <button
              key={o.value}
              onClick={() => setResult(o.value)}
              className={`min-h-12 rounded-xl border p-2 text-sm font-semibold leading-tight ${
                selected ? selectedClass : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </section>

      {result === "falseWin" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Who declared the false win?</h2>
          <SeatPicker
            gameId={game.id}
            players={game.players}
            wind={round.windBefore}
            selectedId={falseWinnerId}
            tone="rose"
            onPick={setFalseWinnerId}
          />
          <p className="text-sm text-slate-400">
            Pays {falseWinPenaltyEach(game.ruleSet)} pts to each other player.
          </p>
        </section>
      )}

      {result === "win" && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Who won?</h2>
            <SeatPicker
              gameId={game.id}
              players={game.players}
              wind={round.windBefore}
              selectedId={winnerId}
              onPick={chooseWinner}
            />
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
              <SeatPicker
                gameId={game.id}
                players={game.players}
                wind={round.windBefore}
                selectedId={discarderId}
                disabledId={winnerId}
                disabledLabel="Winner"
                onPick={setDiscarderId}
              />
            </section>
          )}

          <section className="flex flex-col items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">How many faan?</h2>
            <FaanModeToggle mode={faanMode} onChange={changeFaanMode} />
            {isAutomatic ? (
              <FaanCalculatorTable ruleSet={game.ruleSet} selection={selection} onChange={setSelection} />
            ) : (
              <FaanStepper value={faan} min={minFaan} max={maxFaan} onChange={setFaan} />
            )}
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

      <FixedBottomBar className="flex flex-col gap-3">
        {result === "win" && isAutomatic && <FaanTotalFooter ruleSet={game.ruleSet} selection={selection} onChange={setSelection} />}
        <div className="flex gap-3">
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
        </div>
      </FixedBottomBar>
    </div>
  );
}
