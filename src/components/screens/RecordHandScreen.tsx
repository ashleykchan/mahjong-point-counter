import { useState } from "react";
import type { FaanSelection, GameState, PlayerId, WinMethod } from "../../types";
import { computePayouts, pointsForFaan } from "../../lib/scoring";
import { formatMoney, pointsToMoney } from "../../lib/money";
import { FaanStepper } from "../FaanStepper";
import { getCurrentWind } from "../../lib/wind";
import { FixedBottomBar } from "../FixedBottomBar";
import { SeatPicker } from "../SeatPicker";
import { FaanCalculatorTable, FaanModeToggle, FaanTotalFooter } from "../FaanCalculator";
import {
  applyWinMethod,
  calculateFaan,
  describeCalculation,
  emptySelection,
  patternsFor,
  type FaanInputMode,
} from "../../lib/faanCalculator";
import { loadFaanInputMode, saveFaanInputMode } from "../../lib/storage";

interface RecordHandScreenProps {
  game: GameState;
  onConfirm: (
    winnerId: PlayerId,
    method: WinMethod,
    faan: number,
    discarderId: PlayerId | undefined,
    faanCalc: FaanSelection | undefined,
  ) => void;
  onCancel: () => void;
}

type Step = "winner" | "method" | "discarder" | "faan" | "preview";

export function RecordHandScreen({ game, onConfirm, onCancel }: RecordHandScreenProps) {
  const [step, setStep] = useState<Step>("winner");
  const [winnerId, setWinnerId] = useState<PlayerId | null>(null);
  const [method, setMethod] = useState<WinMethod | null>(null);
  const [discarderId, setDiscarderId] = useState<PlayerId | null>(null);
  const [faan, setFaan] = useState(game.ruleSet.minFaan);
  const [faanMode, setFaanMode] = useState<FaanInputMode>(loadFaanInputMode);
  const [selection, setSelection] = useState<FaanSelection>(emptySelection);

  const { minFaan, maxFaan } = game.ruleSet;
  const calc = calculateFaan(game.ruleSet, selection);
  const isAutomatic = faanMode === "automatic";
  const handFaan = isAutomatic ? calc.total : faan;

  function changeFaanMode(mode: FaanInputMode) {
    // Carry the calculated total over so switching to Manual starts from what was worked out.
    if (mode === "manual" && isAutomatic) setFaan(Math.min(Math.max(calc.total, minFaan), maxFaan));
    setFaanMode(mode);
    saveFaanInputMode(mode);
  }

  const wind = getCurrentWind(game);
  const nameOf = (id: PlayerId) => game.players.find((p) => p.id === id)?.name ?? "?";

  function back() {
    if (step === "method") setStep("winner");
    else if (step === "discarder") setStep("method");
    else if (step === "faan") setStep(method === "discard" ? "discarder" : "method");
    else if (step === "preview") setStep("faan");
    else onCancel();
  }

  function chooseWinner(id: PlayerId) {
    setWinnerId(id);
    setStep("method");
  }

  function chooseMethod(m: WinMethod) {
    setMethod(m);
    setFaan(game.ruleSet.minFaan);
    setSelection((prev) => applyWinMethod(patternsFor(game.ruleSet), prev, m));
    setStep(m === "discard" ? "discarder" : "faan");
  }

  function chooseDiscarder(id: PlayerId) {
    setDiscarderId(id);
    setStep("faan");
  }

  const payouts =
    winnerId && method ? computePayouts(game.ruleSet, game.players, winnerId, method, handFaan, discarderId ?? undefined) : [];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 text-slate-100">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={back} className="text-2xl leading-none text-slate-400" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-xl font-bold">Record Hand</h1>
      </header>

      {step === "winner" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Who won?</h2>
          <SeatPicker gameId={game.id} players={game.players} wind={wind} onPick={chooseWinner} />
        </section>
      )}

      {step === "method" && winnerId && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            How did {nameOf(winnerId)} win?
          </h2>
          <button
            onClick={() => chooseMethod("self-draw")}
            className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-lg font-semibold active:bg-slate-700"
          >
            Self-drawn
          </button>
          <button
            onClick={() => chooseMethod("discard")}
            className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-lg font-semibold active:bg-slate-700"
          >
            Won off discard
          </button>
        </section>
      )}

      {step === "discarder" && winnerId && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Who discarded?</h2>
          <SeatPicker
            gameId={game.id}
            players={game.players}
            wind={wind}
            disabledId={winnerId}
            disabledLabel="Winner"
            onPick={chooseDiscarder}
          />
        </section>
      )}

      {step === "faan" && winnerId && method && (
        <section className="flex flex-col items-center gap-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">How many faan?</h2>
          <FaanModeToggle mode={faanMode} onChange={changeFaanMode} />
          {isAutomatic ? (
            <>
              <FaanCalculatorTable ruleSet={game.ruleSet} selection={selection} onChange={setSelection} />
              <FixedBottomBar className="flex flex-col gap-3">
                <FaanTotalFooter ruleSet={game.ruleSet} selection={selection} onChange={setSelection} />
                <button
                  onClick={() => setStep("preview")}
                  disabled={calc.belowMin}
                  className="w-full rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400 disabled:opacity-40"
                >
                  Continue
                </button>
              </FixedBottomBar>
            </>
          ) : (
            <>
              <FaanStepper value={faan} min={minFaan} max={maxFaan} onChange={setFaan} />
              <p className="text-slate-400">
                = {pointsForFaan(game.ruleSet, faan)} pts
                {game.moneyPerPoint > 0 && ` (${formatMoney(pointsToMoney(pointsForFaan(game.ruleSet, faan), game.moneyPerPoint))})`}{" "}
                {method === "self-draw" ? "from each opponent" : "from discarder"}
              </p>
              <button
                onClick={() => setStep("preview")}
                className="w-full rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400"
              >
                Continue
              </button>
            </>
          )}
        </section>
      )}

      {step === "preview" && winnerId && method && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Confirm payouts</h2>
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
            <p className="mb-3 text-lg font-semibold">
              {nameOf(winnerId)} wins with {handFaan} faan
              {method === "self-draw" ? " (self-drawn)" : ` off ${nameOf(discarderId!)}'s discard`}
            </p>
            {isAutomatic && <p className="-mt-2 mb-3 text-sm text-slate-400">{describeCalculation(game.ruleSet, selection)}</p>}
            <ul className="flex flex-col gap-2">
              {payouts.map((p, i) => (
                <li key={i} className="flex items-center justify-between text-base">
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
          </div>

          <FixedBottomBar className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-600 p-4 text-lg font-semibold text-slate-300 active:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(winnerId, method, handFaan, discarderId ?? undefined, isAutomatic ? selection : undefined)}
              className="flex-1 rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400"
            >
              Confirm
            </button>
          </FixedBottomBar>
        </section>
      )}
    </div>
  );
}
