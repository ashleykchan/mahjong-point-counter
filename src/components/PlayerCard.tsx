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
    <div
      className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border p-4 ${
        isLeader ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-slate-800"
      }`}
    >
      {isLeader && (
        <span className="absolute -top-2 right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
          LEADER
        </span>
      )}
      {seatWind && (
        <span
          className={`absolute -top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isDealer ? "bg-sky-400 text-slate-900" : "bg-slate-700 text-slate-300"
          }`}
        >
          {seatWind}
          {isDealer ? " · DEALER" : ""}
        </span>
      )}
      <span className="mt-2 truncate text-base font-medium text-slate-200">{name}</span>
      <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{score > 0 ? `+${score}` : score}</span>
      {money !== undefined && (
        <span className={`text-sm font-semibold tabular-nums ${moneyColor}`}>{formatMoney(money)}</span>
      )}
    </div>
  );
}
