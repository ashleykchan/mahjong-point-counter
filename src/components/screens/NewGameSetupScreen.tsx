import { useState } from "react";
import type { Player, RuleSet } from "../../types";

const DEFAULT_NAMES = ["East", "South", "West", "North"];

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface NewGameSetupScreenProps {
  ruleSets: RuleSet[];
  onEditRules: () => void;
  onStart: (players: Player[], startingScores: Record<string, number>, ruleSet: RuleSet, moneyPerPoint: number) => void;
  /** Pre-fill actual (editable) names, e.g. when rematching with the same players. Omit for blank fields. */
  initialNames?: string[];
  initialRuleSetId?: string;
  initialMoneyPerPoint?: number;
}

export function NewGameSetupScreen({
  ruleSets,
  onEditRules,
  onStart,
  initialNames,
  initialRuleSetId,
  initialMoneyPerPoint,
}: NewGameSetupScreenProps) {
  const [names, setNames] = useState<string[]>(initialNames ?? ["", "", "", ""]);
  const [startingScores, setStartingScores] = useState<number[]>([0, 0, 0, 0]);
  const [ruleSetId, setRuleSetId] = useState<string>(initialRuleSetId ?? ruleSets[0]?.id ?? "");
  const [moneyPerPoint, setMoneyPerPoint] = useState((initialMoneyPerPoint ?? 0).toFixed(2));

  const selectedRuleSet = ruleSets.find((r) => r.id === ruleSetId) ?? ruleSets[0];

  function handleStart() {
    if (!selectedRuleSet) return;
    const ids = names.map(() => uid());
    const players: Player[] = names.map((name, i) => ({
      id: ids[i],
      name: name.trim() || DEFAULT_NAMES[i],
    }));
    const scores: Record<string, number> = {};
    players.forEach((p, i) => {
      scores[p.id] = startingScores[i] || 0;
    });
    onStart(players, scores, selectedRuleSet, Math.max(0, Number(moneyPerPoint) || 0));
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-slate-900 p-4 pb-28 text-slate-100">
      <header className="pt-4">
        <h1 className="text-2xl font-bold">New Game</h1>
        <p className="text-sm text-slate-400">Set up players and rules before dealing.</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Players</h2>
        <p className="-mt-2 text-xs text-slate-500">Seated in this order. Player 1 starts as dealer (East).</p>
        {names.map((name, i) => (
          <div key={i} className="flex gap-3">
            <input
              value={name}
              onChange={(e) => setNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
              placeholder={DEFAULT_NAMES[i]}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg"
            />
            <input
              type="number"
              value={startingScores[i]}
              onChange={(e) =>
                setStartingScores((prev) => prev.map((s, idx) => (idx === i ? Number(e.target.value) : s)))
              }
              className="w-24 rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg tabular-nums"
              aria-label={`${name} starting score`}
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Payout rules</h2>
        <select
          value={ruleSetId}
          onChange={(e) => setRuleSetId(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-lg"
        >
          {ruleSets.map((rs) => (
            <option key={rs.id} value={rs.id}>
              {rs.name}
            </option>
          ))}
        </select>
        <button onClick={onEditRules} className="self-start text-sm font-semibold text-amber-400 underline underline-offset-2">
          Edit payout rules
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Money per point</h2>
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 p-3">
          <span className="text-lg text-slate-400">$</span>
          <input
            type="number"
            step={0.01}
            min={0}
            inputMode="decimal"
            value={moneyPerPoint}
            onChange={(e) => setMoneyPerPoint(e.target.value)}
            onBlur={() => setMoneyPerPoint((Math.max(0, Number(moneyPerPoint) || 0)).toFixed(2))}
            className="w-full bg-transparent text-lg outline-none"
          />
        </div>
        <p className="text-xs text-slate-500">$0.00 means points only &ndash; no money is shown.</p>
      </section>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-slate-800 bg-slate-900 p-4">
        <button
          onClick={handleStart}
          disabled={!selectedRuleSet}
          className="w-full rounded-xl bg-emerald-500 p-4 text-lg font-bold text-emerald-950 active:bg-emerald-400 disabled:opacity-40"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
