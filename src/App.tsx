import { useState } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import { NewGameSetupScreen } from "./components/screens/NewGameSetupScreen";
import { ScoreboardScreen } from "./components/screens/ScoreboardScreen";
import { RecordHandScreen } from "./components/screens/RecordHandScreen";
import { RoundHistoryScreen } from "./components/screens/RoundHistoryScreen";
import { RuleLibraryScreen } from "./components/screens/RuleLibraryScreen";
import { AdjustWindScreen } from "./components/screens/AdjustWindScreen";
import { MoneySettingScreen } from "./components/screens/MoneySettingScreen";
import { GameSummaryScreen } from "./components/screens/GameSummaryScreen";
import { computePayouts } from "./lib/scoring";
import { completedFullCycle, getCurrentWind, nextWindState } from "./lib/wind";
import type { PlayerId, WinMethod } from "./types";

type View = "setup" | "scoreboard" | "record" | "history" | "rules" | "money" | "adjustWind";

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
    adjustWind,
    setMoneyPerPoint,
    upsertRuleSet,
    deleteRuleSet,
  } = useGame();
  const [view, setView] = useState<View>(game ? "scoreboard" : "setup");
  const [justCompletedCycle, setJustCompletedCycle] = useState(false);

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

  if (view === "history") {
    return <RoundHistoryScreen game={game} onClose={() => setView("scoreboard")} onUndoLast={undoLastRound} />;
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

export default function App() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}
