import { useState } from "react";
import type { RuleSet } from "../../types";
import { RuleEditorScreen } from "./RuleEditorScreen";
import { defaultRuleSet } from "../../lib/defaultRules";

interface RuleLibraryScreenProps {
  ruleSets: RuleSet[];
  onUpsert: (ruleSet: RuleSet) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function RuleLibraryScreen({ ruleSets, onUpsert, onDelete, onClose }: RuleLibraryScreenProps) {
  const [editing, setEditing] = useState<RuleSet | null>(null);

  if (editing) {
    const isNew = !ruleSets.some((r) => r.id === editing.id);
    return (
      <RuleEditorScreen
        title={isNew ? "New rule set" : "Edit rule set"}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={(rs) => {
          onUpsert(rs);
          setEditing(null);
        }}
        onDelete={
          !isNew
            ? () => {
                onDelete(editing.id);
                setEditing(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-slate-900 p-4 text-slate-100">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={onClose} className="text-2xl leading-none text-slate-400" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-xl font-bold">Payout Rules</h1>
      </header>

      <div className="flex flex-col gap-3">
        {ruleSets.map((rs) => (
          <div key={rs.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex flex-col">
              <span className="font-semibold">{rs.name}</span>
              <span className="text-sm text-slate-400">
                {rs.minFaan}-{rs.maxFaan} faan &middot; self-draw &times;{rs.selfDrawMultiplier} &middot; deal-in &times;
                {rs.dealInMultiplier}
              </span>
            </div>
            <button
              onClick={() => setEditing(rs)}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold active:bg-slate-700"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setEditing({ ...defaultRuleSet(), id: uid(), name: "New rule set" })}
        className="rounded-xl border border-dashed border-slate-600 p-4 text-base font-semibold text-slate-300 active:bg-slate-800"
      >
        + New rule set
      </button>
    </div>
  );
}
