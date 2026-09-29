import type { GameState, RuleSet } from "../types";
import type { FaanInputMode } from "./faanCalculator";

const KEYS = {
  game: "mahjong.currentGame",
  ruleSets: "mahjong.ruleSets",
  faanInputMode: "mahjong.faanInputMode",
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (e.g. private mode quota) - fail silently, in-memory state still works
  }
}

export function loadGame(): GameState | null {
  return read<GameState>(KEYS.game);
}

export function saveGame(game: GameState | null): void {
  if (game === null) {
    localStorage.removeItem(KEYS.game);
  } else {
    write(KEYS.game, game);
  }
}

export function loadRuleSets(): RuleSet[] {
  return read<RuleSet[]>(KEYS.ruleSets) ?? [];
}

export function saveRuleSets(ruleSets: RuleSet[]): void {
  write(KEYS.ruleSets, ruleSets);
}

export function loadFaanInputMode(): FaanInputMode {
  return read<FaanInputMode>(KEYS.faanInputMode) === "automatic" ? "automatic" : "manual";
}

export function saveFaanInputMode(mode: FaanInputMode): void {
  write(KEYS.faanInputMode, mode);
}
