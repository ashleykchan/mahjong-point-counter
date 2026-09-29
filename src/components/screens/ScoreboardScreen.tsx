import { useState } from "react";
import type { GameState } from "../../types";
import { computeStandings } from "../../lib/scoring";
import { getCurrentWind, seatWindLabel, WIND_LABELS } from "../../lib/wind";
import { pointsToMoney } from "../../lib/money";
import { PlayerCard } from "../PlayerCard";
import { WindBanner } from "../WindBanner";
import { FixedBottomBar } from "../FixedBottomBar";

interface ScoreboardScreenProps {
  game: GameState;
  onRecordHand: () => void;
  onDraw: () => void;
  onOpenHistory: () => void;
  onOpenRules: () => void;
  onOpenMoney: () => void;
  onAdjustWind: () => void;
  onEndGame: () => void;
  justCompletedCycle: boolean;
  onDismissCycleNotice: () => void;
}

export function ScoreboardScreen({
  game,
  onRecordHand,
  onDraw,
  onOpenHistory,
  onOpenRules,
  onOpenMoney,
  onAdjustWind,
  onEndGame,
  justCompletedCycle,
  onDismissCycleNotice,
}: ScoreboardScreenProps) {
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const standings = computeStandings(game);
  const wind = getCurrentWind(game);
  const maxScore = Math.max(...game.players.map((p) => standings[p.id] ?? 0));
  const hasMoney = game.moneyPerPoint > 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-slate-900 p-4 text-slate-100">
      <header className="flex items-center justify-between pt-4">
        <h1 className="text-2xl font-bold">Scoreboard</h1>
        <button onClick={onOpenMoney} className="text-sm font-semibold text-slate-400 underline underline-offset-2">
          {hasMoney ? `$${game.moneyPerPoint.toFixed(2)}/pt` : "Set money/pt"}
        </button>
      </header>

      <WindBanner wind={wind} players={game.players} onAdjust={onAdjustWind} />

      <div className="grid grid-cols-2 gap-3">
        {game.players.map((p, i) => {
          const score = standings[p.id] ?? 0;
          return (
            <PlayerCard
              key={p.id}
              name={p.name}
              score={score}
              isLeader={score === maxScore && score !== 0}
              seatWind={seatWindLabel(i, wind.dealerIndex)}
              isDealer={i === wind.dealerIndex}
              money={hasMoney ? pointsToMoney(score, game.moneyPerPoint) : undefined}
            />
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onOpenHistory}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm font-semibold active:bg-slate-700"
        >
          Round History ({game.rounds.length})
        </button>
        <button
          onClick={onOpenRules}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm font-semibold active:bg-slate-700"
        >
          Payout Rules
        </button>
      </div>

      {confirmingEnd ? (
        <div className="flex flex-col gap-2 rounded-xl border border-rose-800 bg-rose-950 p-3">
          <p className="text-sm text-rose-200">End the game now and see final results?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingEnd(false)}
              className="flex-1 rounded-lg border border-slate-600 p-2 text-sm font-semibold text-slate-300 active:bg-slate-800"
            >
              Keep Playing
            </button>
            <button
              onClick={onEndGame}
              className="flex-1 rounded-lg bg-rose-600 p-2 text-sm font-bold text-rose-50 active:bg-rose-500"
            >
              End Game
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingEnd(true)}
          className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm font-semibold text-rose-300 active:bg-rose-950"
        >
          End Game
        </button>
      )}

      {justCompletedCycle && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 p-4">
          <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-amber-500 bg-slate-800 p-5">
            <h2 className="text-lg font-bold text-amber-300">Full Round Complete</h2>
            <p className="text-sm text-slate-300">
              East, South, West, and North rounds are all done ({WIND_LABELS[wind.prevailingWind]} round is starting).
              End the game here, or keep playing another round?
            </p>
            <div className="flex gap-2">
              <button
                onClick={onDismissCycleNotice}
                className="flex-1 rounded-lg border border-slate-600 p-3 text-sm font-semibold text-slate-200 active:bg-slate-700"
              >
                Keep Playing
              </button>
              <button
                onClick={onEndGame}
                className="flex-1 rounded-lg bg-emerald-500 p-3 text-sm font-bold text-emerald-950 active:bg-emerald-400"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}

      <FixedBottomBar className="flex flex-col gap-2">
        <button
          onClick={onRecordHand}
          className="w-full rounded-xl bg-emerald-500 p-5 text-xl font-bold text-emerald-950 active:bg-emerald-400"
        >
          Record Hand
        </button>
        <button
          onClick={onDraw}
          className="w-full rounded-xl border border-slate-600 p-3 text-base font-semibold text-slate-300 active:bg-slate-800"
        >
          Draw / No Winner
        </button>
      </FixedBottomBar>
    </div>
  );
}
