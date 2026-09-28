import { useState } from "react";
import type { FaanTable, RuleSet } from "../../types";

interface RuleEditorScreenProps {
  initial: RuleSet;
  title: string;
  onSave: (ruleSet: RuleSet) => void;
  onSaveAsNew?: (ruleSet: RuleSet) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function resizeTable(table: FaanTable, oldMin: number, min: number, max: number): FaanTable {
  const next: FaanTable = {};
  let last = table[oldMin] ?? 8;
  for (let f = min; f <= max; f++) {
    if (table[f] !== undefined) {
      next[f] = table[f];
      last = table[f];
    } else {
      last = last * 2;
      next[f] = last;
    }
  }
  return next;
}

export function RuleEditorScreen({ initial, title, onSave, onSaveAsNew, onCancel, onDelete }: RuleEditorScreenProps) {
  const [name, setName] = useState(initial.name);
  const [minFaan, setMinFaan] = useState(initial.minFaan);
  const [maxFaan, setMaxFaan] = useState(initial.maxFaan);
  const [faanTable, setFaanTable] = useState<FaanTable>(initial.faanTable);
  const [selfDrawMultiplier, setSelfDrawMultiplier] = useState(initial.selfDrawMultiplier);
  const [dealInMultiplier, setDealInMultiplier] = useState(initial.dealInMultiplier);
  const [dealerStaysOnDraw, setDealerStaysOnDraw] = useState(initial.dealerStaysOnDraw);

  function updateRange(newMin: number, newMax: number) {
    const min = Math.min(Math.max(newMin, 1), 13);
    const max = Math.min(Math.max(newMax, min), 13);
    setFaanTable((prev) => resizeTable(prev, minFaan, min, max));
    setMinFaan(min);
    setMaxFaan(max);
  }

  function buildRuleSet(): RuleSet {
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
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm text-slate-400">Min faan to win</label>
          <input
            type="number"
            value={minFaan}
            onChange={(e) => updateRange(Number(e.target.value), maxFaan)}
            className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg tabular-nums"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm text-slate-400">Max faan (limit)</label>
          <input
            type="number"
            value={maxFaan}
            onChange={(e) => updateRange(minFaan, Number(e.target.value))}
            className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg tabular-nums"
          />
        </div>
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
                value={faanTable[faan] ?? 0}
                onChange={(e) =>
                  setFaanTable((prev) => ({ ...prev, [faan]: Math.max(0, Number(e.target.value)) }))
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-right text-lg tabular-nums"
              />
              <span className="w-6 shrink-0 text-slate-500">pts</span>
            </div>
          ))}
        </div>
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
