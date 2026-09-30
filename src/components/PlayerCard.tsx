import { formatMoney } from "../lib/money";

interface PlayerCardProps {
  name: string;
  score: number;
  isLeader: boolean;
  seatWind?: string;
  isDealer?: boolean;
  money?: number;
}

export function PlayerCard({ name, score, isLeader, seatWind, isDealer, money }: PlayerCardProps) {
  const scoreColor = score > 0 ? "text-emerald-400" : score < 0 ? "text-rose-400" : "text-slate-300";
  const moneyColor = money !== undefined ? (money > 0 ? "text-emerald-500/80" : money < 0 ? "text-rose-500/80" : "text-slate-500") : "";

  return (
    // Badges sit centred on the top and bottom edges so they never collide in a narrow seat.
    <div
      className={`relative flex min-w-0 flex-col items-center justify-center rounded-2xl border px-2 pb-3 pt-4 ${
        isLeader ? "border-amber-400 bg-amber-400/10" : isDealer ? "border-sky-500/70 bg-slate-800" : "border-slate-700 bg-slate-800"
      }`}
    >
      {seatWind && (
        <span
          className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            isDealer ? "bg-sky-400 text-slate-900" : "bg-slate-700 text-slate-300"
          }`}
        >
          {seatWind}
          {isDealer ? " · Dealer" : ""}
        </span>
      )}
      <span className="w-full truncate text-center text-sm font-medium text-slate-200" title={name}>
        {name}
      </span>
      <span className={`text-2xl font-bold leading-tight tabular-nums ${scoreColor}`}>{score > 0 ? `+${score}` : score}</span>
      {money !== undefined && (
        <span className={`text-xs font-semibold tabular-nums ${moneyColor}`}>{formatMoney(money)}</span>
      )}
      {isLeader && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
          LEADER
        </span>
      )}
    </div>
  );
}
