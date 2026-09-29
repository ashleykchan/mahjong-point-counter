import type { FaanSelection, HandPattern, RuleSet } from "../types";
import {
  SECTION_LABELS,
  SECTION_ORDER,
  blockedReason,
  calculateFaan,
  patternsFor,
  setPatternCount,
  type FaanInputMode,
} from "../lib/faanCalculator";

export function FaanModeToggle({ mode, onChange }: { mode: FaanInputMode; onChange: (mode: FaanInputMode) => void }) {
  const options: { value: FaanInputMode; label: string }[] = [
    { value: "manual", label: "Manual" },
    { value: "automatic", label: "Automatic" },
  ];
  return (
    <div role="radiogroup" aria-label="Faan input mode" className="grid w-full grid-cols-2 gap-1 rounded-xl bg-slate-800 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={mode === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-lg text-sm font-semibold ${
            mode === o.value ? "bg-emerald-500 text-emerald-950" : "text-slate-300 active:bg-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function faanLabel(pattern: HandPattern): string {
  if (pattern.section === "limit") return "Limit";
  return pattern.kind === "count" ? `${pattern.faan} each` : String(pattern.faan);
}

function PatternText({ pattern, note }: { pattern: HandPattern; note: string | null }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block font-medium leading-tight text-slate-100">{pattern.name}</span>
      <span className="block text-sm leading-tight text-slate-400">{pattern.chineseName}</span>
      <span className="mt-0.5 block text-xs leading-snug text-slate-500">{pattern.description}</span>
      {note && <span className="mt-0.5 block text-xs font-medium text-amber-300">{note}</span>}
    </span>
  );
}

function PatternRow({
  pattern,
  count,
  blocked,
  onSetCount,
}: {
  pattern: HandPattern;
  count: number;
  blocked: string | null;
  onSetCount: (count: number) => void;
}) {
  const isAuto = pattern.auto === "self-draw";
  const disabled = isAuto || blocked !== null;
  const note = isAuto ? "Set by win type" : blocked;
  const faan = <span className="shrink-0 pl-1 text-right tabular-nums text-slate-300">{faanLabel(pattern)}</span>;

  if (pattern.kind === "count") {
    const max = pattern.maxCount ?? 1;
    const stepClass =
      "flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-xl font-bold text-slate-100 active:bg-slate-600 disabled:opacity-30";
    return (
      // The whole row counts up (wrapping back to 0 after the max); the - / + buttons are there for precision.
      <div
        onClick={() => !disabled && onSetCount(count >= max ? 0 : count + 1)}
        className={`flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 ${disabled ? "opacity-50" : "active:bg-slate-700/50"}`}
      >
        <span className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={disabled || count <= 0}
            onClick={() => onSetCount(count - 1)}
            className={stepClass}
            aria-label={`Fewer ${pattern.name}`}
          >
            &minus;
          </button>
          <span className={`w-5 text-center font-bold tabular-nums ${count > 0 ? "text-emerald-300" : "text-slate-400"}`}>
            {count}
          </span>
          <button
            type="button"
            disabled={disabled || count >= max}
            onClick={() => onSetCount(count + 1)}
            className={stepClass}
            aria-label={`More ${pattern.name}`}
          >
            +
          </button>
        </span>
        <PatternText pattern={pattern} note={note} />
        {faan}
      </div>
    );
  }

  const checked = count > 0;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onSetCount(checked ? 0 : 1)}
      className={`flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left ${
        disabled ? (isAuto ? "" : "opacity-50") : "active:bg-slate-700/50"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
          checked ? "border-emerald-400 bg-emerald-400 text-emerald-950" : "border-slate-500"
        }`}
      >
        {checked && "✓"}
      </span>
      <PatternText pattern={pattern} note={note} />
      {faan}
    </button>
  );
}

interface CalculatorProps {
  ruleSet: RuleSet;
  selection: FaanSelection;
  onChange: (selection: FaanSelection) => void;
}

export function FaanCalculatorTable({ ruleSet, selection, onChange }: CalculatorProps) {
  const patterns = patternsFor(ruleSet).filter((p) => p.enabled);
  return (
    <div className="flex w-full flex-col gap-4">
      {SECTION_ORDER.map((section) => {
        const rows = patterns.filter((p) => p.section === section);
        if (rows.length === 0) return null;
        return (
          <section key={section} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {SECTION_LABELS[section]}
              {section === "limit" && (
                <span className="ml-1 normal-case tracking-normal text-slate-500">&middot; {ruleSet.maxFaan} faan</span>
              )}
            </h3>
            <div className="divide-y divide-slate-700 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
              {rows.map((p) => (
                <PatternRow
                  key={p.id}
                  pattern={p}
                  count={selection.counts[p.id] ?? 0}
                  blocked={blockedReason(patterns, selection, p.id)}
                  onSetCount={(count) => onChange(setPatternCount(patterns, selection, p.id, count))}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Live total plus the house-rule adjustment; lives in the screen's fixed bottom bar. */
export function FaanTotalFooter({ ruleSet, selection, onChange }: CalculatorProps) {
  const result = calculateFaan(ruleSet, selection);
  const adj = selection.adjustment;
  const setAdj = (value: number) => onChange({ ...selection, adjustment: value });
  const stepClass =
    "flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg font-bold text-slate-100 active:bg-slate-600 disabled:opacity-30";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0" aria-live="polite">
        <p className="text-xl font-bold tabular-nums text-slate-50">Total: {result.total} faan</p>
        {result.limitPattern && <p className="text-xs text-amber-300">Limit hand</p>}
        {result.capped && <p className="text-xs text-amber-300">Capped at {ruleSet.maxFaan}</p>}
        {result.belowMin && <p className="text-xs text-rose-300">Under the {ruleSet.minFaan}-faan minimum to win</p>}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Adjust &plusmn; faan</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={adj <= -ruleSet.maxFaan}
            onClick={() => setAdj(adj - 1)}
            className={stepClass}
            aria-label="Adjust faan down"
          >
            &minus;
          </button>
          <span className="w-8 text-center font-bold tabular-nums text-slate-200">
            {adj > 0 ? `+${adj}` : adj}
          </span>
          <button
            type="button"
            disabled={adj >= ruleSet.maxFaan}
            onClick={() => setAdj(adj + 1)}
            className={stepClass}
            aria-label="Adjust faan up"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
