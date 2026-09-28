import type { Player, WindState } from "../types";
import { windBannerText } from "../lib/wind";

interface WindBannerProps {
  wind: WindState;
  players: Player[];
  onAdjust: () => void;
}

export function WindBanner({ wind, players, onAdjust }: WindBannerProps) {
  const { title, dealer, repeat } = windBannerText(wind, players);
  return (
    <button
      onClick={onAdjust}
      className="flex w-full flex-col gap-0.5 rounded-2xl border border-slate-700 bg-slate-800/70 p-3 text-left active:bg-slate-700"
    >
      <span className="text-sm font-bold text-amber-300">{title}</span>
      <span className="text-xs text-slate-400">
        Dealer: <span className="font-semibold text-slate-200">{dealer}</span>
        {repeat && <span className="ml-2 text-slate-400">{repeat}</span>}
      </span>
    </button>
  );
}
