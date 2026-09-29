import { useState } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import { NewGameSetupScreen } from "./components/screens/NewGameSetupScreen";
import { ScoreboardScreen } from "./components/screens/ScoreboardScreen";
import { RecordHandScreen } from "./components/screens/RecordHandScreen";
import { RoundHistoryScreen } from "./components/screens/RoundHistoryScreen";
import { EditRoundScreen } from "./components/screens/EditRoundScreen";
import { RuleLibraryScreen } from "./components/screens/RuleLibraryScreen";
import { AdjustWindScreen } from "./components/screens/AdjustWindScreen";
import { MoneySettingScreen } from "./components/screens/MoneySettingScreen";
import { GameSummaryScreen } from "./components/screens/GameSummaryScreen";
import { computePayouts } from "./lib/scoring";
import { withDeletedRound, withEditedRound, type RoundEdit } from "./lib/rounds";
import { completedFullCycle, getCurrentWind, nextWindState } from "./lib/wind";
import type { GameState, PlayerId, WinMethod } from "./types";

type View = "setup" | "scoreboard" | "record" | "history" | "editRound" | "rules" | "money" | "adjustWind";

function AppShell() {
  const {
    game,
    ruleSets,
    startGame,
    resetToSetup,
    finishGame,
    recordHand,
    recordDraw,
    undoLastRound,
    editRound,
    deleteRound,
    adjustWind,
    setMoneyPerPoint,
    upsertRuleSet,
    deleteRuleSet,
  } = useGame();
  const [view, setView] = useState<View>(game ? "scoreboard" : "setup");
  const [justCompletedCycle, setJustCompletedCycle] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [windChangedNotice, setWindChangedNotice] = useState(false);

  if (view === "rules") {
    return (
      <RuleLibraryScreen
        ruleSets={ruleSets}
        onUpsert={upsertRuleSet}
        onDelete={deleteRuleSet}
        onClose={() => setView(game ? "scoreboard" : "setup")}
      />
    );
  }

  if (!game || view === "setup") {
    // Reaching setup with a game still present means a "same players" rematch: prefill from it.
    const rematchFrom = game;
    return (
      <NewGameSetupScreen
        ruleSets={ruleSets}
        onEditRules={() => setView("rules")}
        onStart={(players, startingScores, ruleSet, moneyPerPoint) => {
          startGame(players, startingScores, ruleSet, moneyPerPoint);
          setJustCompletedCycle(false);
          setView("scoreboard");
        }}
        initialNames={rematchFrom?.players.map((p) => p.name)}
        initialRuleSetId={rematchFrom?.ruleSet.id}
        initialMoneyPerPoint={rematchFrom?.moneyPerPoint}
      />
    );
  }

  // History and round editing are reachable whether the game is still live or already ended.
  if (view === "history") {
    return (
      <RoundHistoryScreen
        game={game}
        onClose={() => setView("scoreboard")}
        onUndoLast={undoLastRound}
        onEditRound={(roundId) => {
          setEditingRoundId(roundId);
          setView("editRound");
        }}
        onDeleteRound={(roundId) => {
          const changed = windChangedByDeletingRound(game, roundId);
          deleteRound(roundId);
          setWindChangedNotice(changed);
        }}
        windChangedNotice={windChangedNotice}
        onDismissWindChangedNotice={() => setWindChangedNotice(false)}
      />
    );
  }

  if (view === "editRound" && editingRoundId) {
    const roundIndex = game.rounds.findIndex((r) => r.id === editingRoundId);
    const round = game.rounds[roundIndex];
    if (!round) {
      setView("history");
      return null;
    }
    return (
      <EditRoundScreen
        game={game}
        round={round}
        roundNumber={roundIndex + 1}
        onCancel={() => {
          setEditingRoundId(null);
          setView("history");
        }}
        onSave={(edit) => {
          const changed = windChangedByEditingRound(game, editingRoundId, edit);
          editRound(editingRoundId, edit);
          setWindChangedNotice(changed);
          setEditingRoundId(null);
          setView("history");
        }}
        onDelete={() => {
          const changed = windChangedByDeletingRound(game, editingRoundId);
          deleteRound(editingRoundId);
          setWindChangedNotice(changed);
          setEditingRoundId(null);
          setView("history");
        }}
      />
    );
  }

  if (game.endedAt) {
    return (
      <GameSummaryScreen
        game={game}
        onStartNewGameSamePlayers={() => setView("setup")}
        onNewGameFromScratch={() => {
          resetToSetup();
          setJustCompletedCycle(false);
          setView("setup");
        }}
        onOpenHistory={() => setView("history")}
      />
    );
  }

  if (view === "record") {
    return (
      <RecordHandScreen
        game={game}
        onCancel={() => setView("scoreboard")}
        onConfirm={(winnerId: PlayerId, method: WinMethod, faan: number, discarderId: PlayerId | undefined) => {
          const windBefore = getCurrentWind(game);
          const windAfter = nextWindState(windBefore, game.players, { isDraw: false, winnerId }, game.ruleSet.dealerStaysOnDraw);
          const payouts = computePayouts(game.ruleSet, game.players, winnerId, method, faan, discarderId);
          recordHand(winnerId, method, faan, discarderId, payouts);
          setView("scoreboard");
          if (completedFullCycle({ windBefore, windAfter })) setJustCompletedCycle(true);
        }}
      />
    );
  }

  if (view === "money") {
    return (
      <MoneySettingScreen
        current={game.moneyPerPoint}
        onCancel={() => setView("scoreboard")}
        onSave={(value) => {
          setMoneyPerPoint(value);
          setView("scoreboard");
        }}
      />
    );
  }

  if (view === "adjustWind") {
    return (
      <AdjustWindScreen
        current={getCurrentWind(game)}
        players={game.players}
        onCancel={() => setView("scoreboard")}
        onSave={(next) => {
          adjustWind(next);
          setView("scoreboard");
        }}
      />
    );
  }

  return (
    <ScoreboardScreen
      game={game}
      onRecordHand={() => setView("record")}
      onDraw={() => {
        const windBefore = getCurrentWind(game);
        const windAfter = nextWindState(windBefore, game.players, { isDraw: true }, game.ruleSet.dealerStaysOnDraw);
        recordDraw();
        if (completedFullCycle({ windBefore, windAfter })) setJustCompletedCycle(true);
      }}
      onOpenHistory={() => setView("history")}
      onOpenRules={() => setView("rules")}
      onOpenMoney={() => setView("money")}
      onAdjustWind={() => setView("adjustWind")}
      onEndGame={() => {
        finishGame();
        setJustCompletedCycle(false);
      }}
      justCompletedCycle={justCompletedCycle}
      onDismissCycleNotice={() => setJustCompletedCycle(false)}
    />
  );
}

function windChangedByEditingRound(game: GameState, roundId: string, edit: RoundEdit): boolean {
  const before = getCurrentWind(game);
  const after = getCurrentWind({ ...game, rounds: withEditedRound(game, roundId, edit) });
  return JSON.stringify(before) !== JSON.stringify(after);
}

function windChangedByDeletingRound(game: GameState, roundId: string): boolean {
  const before = getCurrentWind(game);
  const after = getCurrentWind({ ...game, rounds: withDeletedRound(game, roundId) });
  return JSON.stringify(before) !== JSON.stringify(after);
}

export default function App() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}
