import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { GameState, Payout, Player, PlayerId, Round, RuleSet, WindState, WinMethod } from "../types";
import { loadGame, loadRuleSets, saveGame, saveRuleSets } from "../lib/storage";
import { defaultRuleSet } from "../lib/defaultRules";
import { getCurrentWind, nextWindState } from "../lib/wind";
import { withDeletedRound, withEditedRound, type RoundEdit } from "../lib/rounds";

interface GameContextValue {
  game: GameState | null;
  ruleSets: RuleSet[];
  startGame: (
    players: Player[],
    startingScores: Record<PlayerId, number>,
    ruleSet: RuleSet,
    moneyPerPoint: number,
  ) => void;
  /** Abandon the current game entirely and return to setup (no summary shown). */
  resetToSetup: () => void;
  /** Mark the current game as finished; the summary screen takes over. */
  finishGame: () => void;
  recordHand: (
    winnerId: PlayerId,
    method: WinMethod,
    faan: number,
    discarderId: PlayerId | undefined,
    payouts: Payout[],
  ) => void;
  recordDraw: () => void;
  undoLastRound: () => void;
  editRound: (roundId: string, edit: RoundEdit) => void;
  deleteRound: (roundId: string) => void;
  adjustWind: (next: WindState) => void;
  setMoneyPerPoint: (value: number) => void;
  upsertRuleSet: (ruleSet: RuleSet) => void;
  deleteRuleSet: (id: string) => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [ruleSets, setRuleSets] = useState<RuleSet[]>(() => {
    const stored = loadRuleSets();
    return stored.length > 0 ? stored : [defaultRuleSet()];
  });

  useEffect(() => saveGame(game), [game]);
  useEffect(() => saveRuleSets(ruleSets), [ruleSets]);

  const value = useMemo<GameContextValue>(
    () => ({
      game,
      ruleSets,
      startGame: (players, startingScores, ruleSet, moneyPerPoint) => {
        setGame({
          id: uid(),
          createdAt: Date.now(),
          players,
          startingScores,
          ruleSet,
          moneyPerPoint,
          rounds: [],
        });
      },
      resetToSetup: () => setGame(null),
      finishGame: () => {
        setGame((prev) => (prev ? { ...prev, endedAt: Date.now() } : prev));
      },
      recordHand: (winnerId, method, faan, discarderId, payouts) => {
        setGame((prev) => {
          if (!prev) return prev;
          const windBefore = getCurrentWind(prev);
          const windAfter = nextWindState(
            windBefore,
            prev.players,
            { isDraw: false, winnerId },
            prev.ruleSet.dealerStaysOnDraw,
          );
          const round: Round = {
            id: uid(),
            timestamp: Date.now(),
            isDraw: false,
            winnerId,
            method,
            discarderId,
            faan,
            payouts,
            windBefore,
            windAfter,
          };
          return { ...prev, rounds: [...prev.rounds, round] };
        });
      },
      recordDraw: () => {
        setGame((prev) => {
          if (!prev) return prev;
          const windBefore = getCurrentWind(prev);
          const windAfter = nextWindState(windBefore, prev.players, { isDraw: true }, prev.ruleSet.dealerStaysOnDraw);
          const round: Round = {
            id: uid(),
            timestamp: Date.now(),
            isDraw: true,
            payouts: [],
            windBefore,
            windAfter,
          };
          return { ...prev, rounds: [...prev.rounds, round] };
        });
      },
      undoLastRound: () => {
        setGame((prev) => {
          if (!prev || prev.rounds.length === 0) return prev;
          return { ...prev, rounds: prev.rounds.slice(0, -1) };
        });
      },
      editRound: (roundId, edit) => {
        setGame((prev) => (prev ? { ...prev, rounds: withEditedRound(prev, roundId, edit) } : prev));
      },
      deleteRound: (roundId) => {
        setGame((prev) => (prev ? { ...prev, rounds: withDeletedRound(prev, roundId) } : prev));
      },
      adjustWind: (next) => {
        setGame((prev) => {
          if (!prev) return prev;
          const windBefore = getCurrentWind(prev);
          const round: Round = {
            id: uid(),
            timestamp: Date.now(),
            isDraw: false,
            isAdjustment: true,
            payouts: [],
            windBefore,
            windAfter: next,
          };
          return { ...prev, rounds: [...prev.rounds, round] };
        });
      },
      setMoneyPerPoint: (moneyPerPoint) => {
        setGame((prev) => (prev ? { ...prev, moneyPerPoint } : prev));
      },
      upsertRuleSet: (ruleSet) => {
        setRuleSets((prev) => {
          const exists = prev.some((r) => r.id === ruleSet.id);
          return exists ? prev.map((r) => (r.id === ruleSet.id ? ruleSet : r)) : [...prev, ruleSet];
        });
      },
      deleteRuleSet: (id) => {
        setRuleSets((prev) => prev.filter((r) => r.id !== id));
      },
    }),
    [game, ruleSets],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
