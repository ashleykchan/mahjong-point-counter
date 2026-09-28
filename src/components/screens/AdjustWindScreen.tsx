import { useState } from "react";
import type { Player, WindIndex, WindState } from "../../types";
import { SEATS_PER_WIND, WIND_LABELS } from "../../lib/wind";

interface AdjustWindScreenProps {
  current: WindState;
  players: Player[];
  onSave: (next: WindState) => void;
  onCancel: () => void;
}

export function AdjustWindScreen({ current, players, onSave, onCancel }: AdjustWindScreenProps) {
  const [prevailingWind, setPrevailingWind] = useState<WindIndex>(current.prevailingWind);
  const [dealerIndex, setDealerIndex] = useState(current.dealerIndex);
  const [dealerSeatNumber, setDealerSeatNumber] = useState(current.dealerSeatNumber);
  const [repeatCount, setRepeatCount] = useState(current.repeatCount);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 pb-28 text-slate-100">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={onCancel} className="text-2xl leading-none text-slate-400" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-xl font-bold">Adjust Wind / Dealer</h1>
      </header>
      <p className="-mt-4 text-sm text-slate-400">
        Use this if the table gets out of sync with the app. This is recorded as an adjustment, not a hand.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Prevailing wind</h2>
        <div className="grid grid-cols-4 gap-2">
          {([0, 1, 2, 3] as WindIndex[]).map((w) => (
            <button
              key={w}
              onClick={() => setPrevailingWind(w)}
              className={`rounded-xl border p-3 text-sm font-semibold ${
                prevailingWind === w ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-slate-700 bg-slate-800"
              }`}
            >
              {WIND_LABELS[w]}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Dealer</h2>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setDealerIndex(i)}
              className={`rounded-xl border p-3 text-sm font-semibold ${
                dealerIndex === i ? "border-sky-400 bg-sky-400/10 text-sky-300" : "border-slate-700 bg-slate-800"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm text-slate-400">Hand number (of {SEATS_PER_WIND})</label>
          <input
            type="number"
            min={1}
            max={SEATS_PER_WIND}
            value={dealerSeatNumber}
            onChange={(e) => setDealerSeatNumber(Math.min(SEATS_PER_WIND, Math.max(1, Number(e.target.value))))}
            className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg tabular-nums"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm text-slate-400">Dealer repeat count</label>
          <input
            type="number"
            min={0}
            value={repeatCount}
            onChange={(e) => setRepeatCount(Math.max(0, Number(e.target.value)))}
            className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg tabular-nums"
          />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-slate-800 bg-slate-900 p-4">
        <button
          onClick={() => onSave({ prevailingWind, dealerIndex, dealerSeatNumber, repeatCount })}
          className="w-full rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400"
        >
          Save
        </button>
      </div>
    </div>
  );
}
