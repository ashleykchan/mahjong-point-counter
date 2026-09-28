import { useState } from "react";
import type { GameState, PlayerId, WinMethod } from "../../types";
import { computePayouts, pointsForFaan } from "../../lib/scoring";
import { formatMoney, pointsToMoney } from "../../lib/money";
import { FaanStepper } from "../FaanStepper";

interface RecordHandScreenProps {
  game: GameState;
  onConfirm: (winnerId: PlayerId, method: WinMethod, faan: number, discarderId: PlayerId | undefined) => void;
  onCancel: () => void;
}

type Step = "winner" | "method" | "discarder" | "faan" | "preview";

export function RecordHandScreen({ game, onConfirm, onCancel }: RecordHandScreenProps) {
  const [step, setStep] = useState<Step>("winner");
  const [winnerId, setWinnerId] = useState<PlayerId | null>(null);
  const [method, setMethod] = useState<WinMethod | null>(null);
  const [discarderId, setDiscarderId] = useState<PlayerId | null>(null);
  const [faan, setFaan] = useState(game.ruleSet.minFaan);

  const nameOf = (id: PlayerId) => game.players.find((p) => p.id === id)?.name ?? "?";
  const others = game.players.filter((p) => p.id !== winnerId);

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
    setStep(m === "discard" ? "discarder" : "faan");
  }

  function chooseDiscarder(id: PlayerId) {
    setDiscarderId(id);
    setStep("faan");
  }

  const payouts =
    winnerId && method ? computePayouts(game.ruleSet, game.players, winnerId, method, faan, discarderId ?? undefined) : [];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 pb-28 text-slate-100">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={back} className="text-2xl leading-none text-slate-400" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-xl font-bold">Record Hand</h1>
      </header>

      {step === "winner" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Who won?</h2>
          <div className="grid grid-cols-2 gap-3">
            {game.players.map((p) => (
              <button
                key={p.id}
                onClick={() => chooseWinner(p.id)}
                className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-lg font-semibold active:bg-slate-700"
              >
                {p.name}
              </button>
            ))}
          </div>
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
          <div className="grid grid-cols-1 gap-3">
            {others.map((p) => (
              <button
                key={p.id}
                onClick={() => chooseDiscarder(p.id)}
                className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-lg font-semibold active:bg-slate-700"
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "faan" && winnerId && method && (
        <section className="flex flex-col items-center gap-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">How many faan?</h2>
          <FaanStepper value={faan} min={game.ruleSet.minFaan} max={game.ruleSet.maxFaan} onChange={setFaan} />
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
        </section>
      )}

      {step === "preview" && winnerId && method && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Confirm payouts</h2>
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
            <p className="mb-3 text-lg font-semibold">
              {nameOf(winnerId)} wins with {faan} faan
              {method === "self-draw" ? " (self-drawn)" : ` off ${nameOf(discarderId!)}'s discard`}
            </p>
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

          <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md gap-3 border-t border-slate-800 bg-slate-900 p-4">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-600 p-4 text-lg font-semibold text-slate-300 active:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(winnerId, method, faan, discarderId ?? undefined)}
              className="flex-1 rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400"
            >
              Confirm
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
