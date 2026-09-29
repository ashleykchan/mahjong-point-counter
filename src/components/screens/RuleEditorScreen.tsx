import { useState } from "react";
import type { FaanTable, RuleSet } from "../../types";
import { extendTable } from "../../lib/rangeExtend";

interface RuleEditorScreenProps {
  initial: RuleSet;
  title: string;
  onSave: (ruleSet: RuleSet) => void;
  onSaveAsNew?: (ruleSet: RuleSet) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const FAAN_FLOOR = 1;
const FAAN_CEILING = 13;

function RangeStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <label className="text-sm text-slate-400">{label}</label>
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800 p-2">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xl font-bold text-slate-100 active:bg-slate-600 disabled:opacity-30"
          aria-label={`Decrease ${label}`}
        >
          &minus;
        </button>
        <span className="text-2xl font-bold tabular-nums text-slate-50">{value}</span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xl font-bold text-slate-100 active:bg-slate-600 disabled:opacity-30"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function RuleEditorScreen({ initial, title, onSave, onSaveAsNew, onCancel, onDelete }: RuleEditorScreenProps) {
  const [name, setName] = useState(initial.name);
  const [minFaan, setMinFaan] = useState(initial.minFaan);
  const [maxFaan, setMaxFaan] = useState(initial.maxFaan);
  // Holds every faan value the user has ever seen, even ones currently outside [minFaan, maxFaan],
  // so narrowing then widening the range restores exactly what was there before.
  const [table, setTable] = useState<FaanTable>(initial.faanTable);
  const [selfDrawMultiplier, setSelfDrawMultiplier] = useState(initial.selfDrawMultiplier);
  const [dealInMultiplier, setDealInMultiplier] = useState(initial.dealInMultiplier);
  const [dealerStaysOnDraw, setDealerStaysOnDraw] = useState(initial.dealerStaysOnDraw);

  function updateMin(newMin: number) {
    const min = Math.min(Math.max(newMin, FAAN_FLOOR), maxFaan);
    setTable((prev) => extendTable(prev, min, maxFaan));
    setMinFaan(min);
  }

  function updateMax(newMax: number) {
    const max = Math.max(Math.min(newMax, FAAN_CEILING), minFaan);
    setTable((prev) => extendTable(prev, minFaan, max));
    setMaxFaan(max);
  }

  function buildRuleSet(): RuleSet {
    const faanTable: FaanTable = {};
    for (let f = minFaan; f <= maxFaan; f++) {
      faanTable[f] = table[f] ?? 0;
    }
    return {
      id: initial.id,
      name: name.trim() || "Untitled rule set",
      minFaan,
      maxFaan,
      faanTable,
      selfDrawMultiplier,
      dealInMultiplier,
      dealerStaysOnDraw,
    };
  }

  const rows = Array.from({ length: maxFaan - minFaan + 1 }, (_, i) => minFaan + i);
  const hasNonIncreasingRow = rows.some((f, i) => i > 0 && (table[f] ?? 0) < (table[rows[i - 1]] ?? 0));

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 bg-slate-900 p-4 pb-28 text-slate-100">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={onCancel} className="text-2xl leading-none text-slate-400" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-xl font-bold">{title}</h1>
      </header>

      <section className="flex flex-col gap-2">
        <label className="text-sm text-slate-400" htmlFor="ruleset-name">
          Rule set name
        </label>
        <input
          id="ruleset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg"
        />
      </section>

      <section className="flex gap-4">
        <RangeStepper label="Min faan to win" value={minFaan} min={FAAN_FLOOR} max={maxFaan} onChange={updateMin} />
        <RangeStepper label="Max faan (limit)" value={maxFaan} min={minFaan} max={FAAN_CEILING} onChange={updateMax} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-slate-400">Points per faan</h2>
        <div className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-800 p-3">
          {rows.map((faan) => (
            <div key={faan} className="flex items-center justify-between gap-3">
              <span className="w-20 shrink-0 text-slate-300">{faan} faan</span>
              <input
                type="number"
                min={0}
                value={table[faan] ?? 0}
                onChange={(e) => setTable((prev) => ({ ...prev, [faan]: Math.max(0, Number(e.target.value)) }))}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-right text-lg tabular-nums"
              />
              <span className="w-6 shrink-0 text-slate-500">pts</span>
            </div>
          ))}
        </div>
        {hasNonIncreasingRow && (
          <p className="rounded-lg border border-amber-800 bg-amber-950 p-2 text-xs text-amber-300">
            Heads up: a higher faan is worth fewer points than a lower one somewhere in this table.
          </p>
        )}
      </section>

      <section className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm text-slate-400">Self-draw multiplier</label>
          <input
            type="number"
            step={0.5}
            min={0}
            value={selfDrawMultiplier}
            onChange={(e) => setSelfDrawMultiplier(Math.max(0, Number(e.target.value)))}
            className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg tabular-nums"
          />
          <p className="text-xs text-slate-500">Each opponent pays base points &times; this value.</p>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm text-slate-400">Deal-in multiplier</label>
          <input
            type="number"
            step={0.5}
            min={0}
            value={dealInMultiplier}
            onChange={(e) => setDealInMultiplier(Math.max(0, Number(e.target.value)))}
            className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg tabular-nums"
          />
          <p className="text-xs text-slate-500">Discarder pays base points &times; this value.</p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-slate-400">On a draw (exhaustive hand)</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDealerStaysOnDraw(true)}
            className={`rounded-xl border p-3 text-sm font-semibold ${
              dealerStaysOnDraw ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-300"
            }`}
          >
            Dealer stays
          </button>
          <button
            onClick={() => setDealerStaysOnDraw(false)}
            className={`rounded-xl border p-3 text-sm font-semibold ${
              !dealerStaysOnDraw ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-300"
            }`}
          >
            Dealer passes
          </button>
        </div>
      </section>

      {onDelete && (
        <button
          onClick={onDelete}
          className="rounded-xl border border-rose-800 bg-rose-950 p-3 text-rose-300 active:bg-rose-900"
        >
          Delete rule set
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-2 border-t border-slate-800 bg-slate-900 p-4">
        {onSaveAsNew && (
          <button
            onClick={() => onSaveAsNew(buildRuleSet())}
            className="rounded-xl border border-slate-600 p-3 text-base font-semibold text-slate-200 active:bg-slate-800"
          >
            Save as new preset
          </button>
        )}
        <button
          onClick={() => onSave(buildRuleSet())}
          className="rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400"
        >
          Save
        </button>
      </div>
    </div>
  );
}
