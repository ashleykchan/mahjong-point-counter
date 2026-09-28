import { useState } from "react";

interface MoneySettingScreenProps {
  current: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}

export function MoneySettingScreen({ current, onSave, onCancel }: MoneySettingScreenProps) {
  const [value, setValue] = useState(current.toFixed(2));
  const parsed = Math.max(0, Number(value) || 0);
  const changed = parsed !== current;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 pb-28 text-slate-100">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={onCancel} className="text-2xl leading-none text-slate-400" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-xl font-bold">Money per Point</h1>
      </header>

      <section className="flex flex-col gap-2">
        <label className="text-sm text-slate-400" htmlFor="money-per-point">
          Dollars per point
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 p-3">
          <span className="text-lg text-slate-400">$</span>
          <input
            id="money-per-point"
            type="number"
            step={0.01}
            min={0}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setValue(parsed.toFixed(2))}
            className="w-full bg-transparent text-lg outline-none"
          />
        </div>
        <p className="text-xs text-slate-500">$0.00 means points only &ndash; no money is shown.</p>
      </section>

      {changed && (
        <p className="rounded-xl border border-amber-800 bg-amber-950 p-3 text-sm text-amber-300">
          Changing this will recalculate every money total shown for this game (past rounds included).
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-slate-800 bg-slate-900 p-4">
        <button
          onClick={() => onSave(parsed)}
          className="w-full rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400"
        >
          Save
        </button>
      </div>
    </div>
  );
}
