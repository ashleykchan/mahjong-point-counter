import type { ReactNode } from "react";
import type { WindIndex } from "../types";
import { playerAt, TABLE_POSITIONS, WIND_CHARACTERS, type TablePosition } from "../lib/seating";
import { WIND_LABELS } from "../lib/wind";

interface TableDiamondProps {
  /** Which seat is drawn at the bottom. */
  rotation: number;
  renderSeat: (playerIndex: number, position: TablePosition) => ReactNode;
  center: ReactNode;
  /** Extra control pinned to the top-right corner (e.g. the rotate button). */
  corner?: ReactNode;
}

// Side cards share whatever width is left beside the 5.5rem table and two 0.5rem gaps; top and bottom match it.
const SEAT_WIDTH = "w-[calc((100%-6.5rem)/2)]";

/** Four seats around a square table, in the positions the players actually sit. */
export function TableDiamond({ rotation, renderSeat, center, corner }: TableDiamondProps) {
  const seat = (position: TablePosition) => {
    const index = playerAt(position, rotation);
    return (
      <div key={position} data-position={position} className="min-w-0">
        {renderSeat(index, position)}
      </div>
    );
  };
  const [bottom, right, top, left] = TABLE_POSITIONS;

  return (
    <div className="relative flex flex-col items-center gap-3">
      {corner && <div className="absolute right-0 top-0">{corner}</div>}
      <div className={SEAT_WIDTH}>{seat(top)}</div>
      <div className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-center gap-2">
        {seat(left)}
        <div className="flex aspect-square w-full items-center justify-center">{center}</div>
        {seat(right)}
      </div>
      <div className={SEAT_WIDTH}>{seat(bottom)}</div>
    </div>
  );
}

/** The table in the middle: the prevailing wind as a large character with its English name beneath. */
export function TableCenter({ wind, onClick }: { wind: WindIndex; onClick?: () => void }) {
  const content = (
    <>
      <span className="text-4xl font-bold leading-none text-amber-300">{WIND_CHARACTERS[wind]}</span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">
        {WIND_LABELS[wind]}
      </span>
    </>
  );
  const className =
    "flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-emerald-800 bg-emerald-950";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${WIND_LABELS[wind]} round. Adjust wind and dealer`}
      className={`${className} active:bg-emerald-900`}
    >
      {content}
    </button>
  ) : (
    <div className={className} aria-label={`${WIND_LABELS[wind]} round`}>
      {content}
    </div>
  );
}
