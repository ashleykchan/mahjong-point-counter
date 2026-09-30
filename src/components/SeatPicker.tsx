import { useState } from "react";
import type { Player, PlayerId, WindState } from "../types";
import { seatWindLabel } from "../lib/wind";
import { loadTableRotation } from "../lib/storage";
import { TableCenter, TableDiamond } from "./TableDiamond";

interface SeatPickerProps {
  gameId: string;
  players: Player[];
  /** Wind state the hand was played under, for seat-wind and dealer labels. */
  wind: WindState;
  selectedId?: PlayerId | null;
  /** A seat that can't be picked (e.g. the winner, when choosing the discarder), shown with `disabledLabel`. */
  disabledId?: PlayerId | null;
  disabledLabel?: string;
  tone?: "emerald" | "rose";
  onPick: (id: PlayerId) => void;
}

/** Choose a player by tapping where they sit, in the same layout and rotation as the scoreboard. */
export function SeatPicker({
  gameId,
  players,
  wind,
  selectedId,
  disabledId,
  disabledLabel,
  tone = "emerald",
  onPick,
}: SeatPickerProps) {
  const [rotation] = useState(() => loadTableRotation(gameId));
  const selectedClass =
    tone === "rose" ? "border-rose-400 bg-rose-400/10 text-rose-300" : "border-emerald-400 bg-emerald-400/10 text-emerald-300";

  return (
    <TableDiamond
      rotation={rotation}
      center={<TableCenter wind={wind.prevailingWind} />}
      renderSeat={(i) => {
        const p = players[i];
        const disabled = p.id === disabledId;
        const selected = p.id === selectedId;
        const isDealer = i === wind.dealerIndex;
        return (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onPick(p.id)}
            className={`flex min-h-20 w-full min-w-0 flex-col items-center justify-center rounded-2xl border px-2 py-3 ${
              disabled
                ? "border-dashed border-slate-700 bg-slate-900 text-slate-500"
                : selected
                  ? selectedClass
                  : "border-slate-700 bg-slate-800 text-slate-100 active:bg-slate-700"
            }`}
          >
            <span className="w-full truncate text-center text-base font-semibold" title={p.name}>
              {p.name}
            </span>
            <span className={`text-[11px] uppercase tracking-wide ${isDealer && !disabled ? "text-sky-300" : "text-slate-500"}`}>
              {disabled && disabledLabel ? disabledLabel : `${seatWindLabel(i, wind.dealerIndex)}${isDealer ? " · Dealer" : ""}`}
            </span>
          </button>
        );
      }}
    />
  );
}
