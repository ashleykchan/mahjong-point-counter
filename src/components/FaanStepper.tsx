interface FaanStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function FaanStepper({ value, min, max, onChange }: FaanStepperProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-3xl font-bold text-slate-100 active:bg-slate-600 disabled:opacity-30"
        aria-label="Decrease faan"
      >
        &minus;
      </button>
      <div className="flex w-28 flex-col items-center">
        <span className="text-6xl font-bold tabular-nums text-slate-50">{value}</span>
        <span className="text-sm uppercase tracking-wide text-slate-400">faan</span>
      </div>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-3xl font-bold text-slate-100 active:bg-slate-600 disabled:opacity-30"
        aria-label="Increase faan"
      >
        +
      </button>
    </div>
  );
}
