import { useState } from "react";
import type { HandPattern, HandPatternSection } from "../types";
import { SECTION_LABELS, SECTION_ORDER } from "../lib/faanCalculator";

const CUSTOM_PREFIX = "custom-";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const inputClass = "min-w-0 rounded-lg border border-slate-600 bg-slate-900 p-2 text-base";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-md px-2 text-sm font-semibold ${
            value === o.value ? "bg-emerald-500 text-emerald-950" : "text-slate-300 active:bg-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AddPatternForm({ onAdd, onCancel }: { onAdd: (pattern: HandPattern) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [chineseName, setChineseName] = useState("");
  const [faan, setFaan] = useState(1);
  const [description, setDescription] = useState("");
  const [section, setSection] = useState<HandPatternSection>("everyday");
  const [kind, setKind] = useState<HandPattern["kind"]>("check");
  const [maxCount, setMaxCount] = useState(2);

  function add() {
    onAdd({
      id: CUSTOM_PREFIX + uid(),
      name: name.trim(),
      chineseName: chineseName.trim(),
      faan: section === "limit" ? 0 : faan,
      description: description.trim(),
      section,
      kind,
      ...(kind === "count" && { maxCount }),
      enabled: true,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-600 bg-slate-800 p-3">
      <input className={inputClass} placeholder="Name (English)" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className={inputClass}
        placeholder="Chinese name"
        value={chineseName}
        onChange={(e) => setChineseName(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="One-line description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Segmented
        value={section}
        onChange={setSection}
        options={SECTION_ORDER.map((s) => ({ value: s, label: SECTION_LABELS[s].replace(" hands", "") }))}
      />
      {section !== "limit" && (
        <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
          Faan{kind === "count" && " (each)"}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={faan}
            onChange={(e) => setFaan(Math.max(0, Number(e.target.value)))}
            className={`${inputClass} w-20 text-right tabular-nums`}
          />
        </label>
      )}
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: "check", label: "Checkbox" },
          { value: "count", label: "Stepper" },
        ]}
      />
      {kind === "count" && (
        <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
          Max count
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={maxCount}
            onChange={(e) => setMaxCount(Math.max(1, Number(e.target.value)))}
            className={`${inputClass} w-20 text-right tabular-nums`}
          />
        </label>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-600 p-2 text-sm font-semibold text-slate-300 active:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          className="flex-1 rounded-lg bg-emerald-500 p-2 text-sm font-bold text-emerald-950 active:bg-emerald-400 disabled:opacity-40"
        >
          Add pattern
        </button>
      </div>
    </div>
  );
}

export function HandPatternsEditor({
  patterns,
  onChange,
}: {
  patterns: HandPattern[];
  onChange: (patterns: HandPattern[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const update = (id: string, change: Partial<HandPattern>) =>
    onChange(patterns.map((p) => (p.id === id ? { ...p, ...change } : p)));

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm text-slate-400">Hand patterns</h2>
      <p className="text-xs text-slate-500">Used by the Automatic faan calculator. Untick a pattern to hide it.</p>
      {SECTION_ORDER.map((section) => {
        const rows = patterns.filter((p) => p.section === section);
        if (rows.length === 0) return null;
        return (
          <div key={section} className="flex flex-col gap-1">
            <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{SECTION_LABELS[section]}</h3>
            <div className="divide-y divide-slate-700 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
              {rows.map((p) => (
                <div key={p.id} className={`flex min-h-12 items-center gap-3 px-3 py-1 ${p.enabled ? "" : "opacity-50"}`}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={p.enabled}
                    aria-label={`Use ${p.name}`}
                    onClick={() => update(p.id, { enabled: !p.enabled })}
                    className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm font-bold ${
                        p.enabled ? "border-emerald-400 bg-emerald-400 text-emerald-950" : "border-slate-500"
                      }`}
                    >
                      {p.enabled && "✓"}
                    </span>
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className="block leading-tight">{p.name}</span>
                    <span className="block text-xs text-slate-400">
                      {p.chineseName}
                      {p.kind === "count" && ` · each, up to ×${p.maxCount ?? 1}`}
                    </span>
                  </span>
                  {section === "limit" ? (
                    <span className="shrink-0 text-sm text-slate-400">Limit</span>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      aria-label={`${p.name} faan`}
                      value={p.faan}
                      onChange={(e) => update(p.id, { faan: Math.max(0, Number(e.target.value)) })}
                      className={`${inputClass} w-14 shrink-0 text-right tabular-nums`}
                    />
                  )}
                  {p.id.startsWith(CUSTOM_PREFIX) && (
                    <button
                      type="button"
                      onClick={() => onChange(patterns.filter((x) => x.id !== p.id))}
                      aria-label={`Remove ${p.name}`}
                      className="-mr-2 flex h-11 w-9 shrink-0 items-center justify-center text-lg text-rose-400"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {adding ? (
        <AddPatternForm
          onAdd={(p) => {
            onChange([...patterns, p]);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-xl border border-dashed border-slate-600 p-3 text-sm font-semibold text-slate-300 active:bg-slate-800"
        >
          + Add custom pattern
        </button>
      )}
    </section>
  );
}
