export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
}

/** Points awarded for a hand of a given faan value. Keyed by faan (as string) for JSON-friendliness. */
export type FaanTable = Record<number, number>;

export interface RuleSet {
  id: string;
  name: string;
  /** Hands below this faan value cannot win (typical HK games require 3). */
  minFaan: number;
  /** Faan is capped at this value (a "limit" hand); table must have an entry for it. */
  maxFaan: number;
  faanTable: FaanTable;
  /** Multiplier applied to the table value when the winner self-draws; each opponent pays this. */
  selfDrawMultiplier: number;
  /** Multiplier applied to the table value when the discarder pays; only the discarder pays. */
  dealInMultiplier: number;
  /** Whether the dealer keeps their seat (and the repeat count goes up) when a hand is drawn. */
  dealerStaysOnDraw: boolean;
  /** What a false winner (詐糊) pays each other player. Missing on older rule sets: min-faan self-draw. */
  falseWinPenalty?: FalseWinPenalty;
  /** Points each other player gets when falseWinPenalty is "flat". */
  falseWinFlatPoints?: number;
  /** Whether the dealer keeps their seat after a false win. Missing on older rule sets: stays. */
  dealerStaysOnFalseWin?: boolean;
  /** Patterns offered by the faan calculator. Missing on rule sets saved before the calculator existed. */
  handPatterns?: HandPattern[];
}

/** "min-self-draw" / "max-self-draw": each other player gets the self-draw amount at the min / max faan. */
export type FalseWinPenalty = "min-self-draw" | "max-self-draw" | "flat";

export type HandPatternSection = "everyday" | "bigger" | "limit";

export interface HandPattern {
  id: string;
  name: string;
  chineseName: string;
  /** Faan awarded (per count, for "count" patterns). Ignored for limit hands, which score the rule set's max faan. */
  faan: number;
  description: string;
  section: HandPatternSection;
  /** "check" is a yes/no pattern; "count" can be scored up to maxCount times (e.g. seat flowers). */
  kind: "check" | "count";
  maxCount?: number;
  /** Set automatically from the win method rather than by hand. */
  auto?: "self-draw";
  /** Pattern ids this one already counts; they can't also be scored ("Included in ..."). */
  includes?: string[];
  /** Pattern ids that can't be scored alongside this one. Either side listing the other is enough. */
  excludes?: string[];
  /** False hides the pattern from the calculator for this rule set. */
  enabled: boolean;
}

/** The calculator inputs behind a round's faan, saved so the round can be reopened in the calculator. */
export interface FaanSelection {
  /** Pattern id -> count (1 for a ticked checkbox). */
  counts: Record<string, number>;
  /** Manual +/- faan for house rules not on the list. */
  adjustment: number;
}

export type WinMethod = "self-draw" | "discard";

export interface Payout {
  from: PlayerId;
  to: PlayerId;
  amount: number;
}

/** 0=East, 1=South, 2=West, 3=North */
export type WindIndex = 0 | 1 | 2 | 3;

export interface WindState {
  /** The prevailing (round) wind. */
  prevailingWind: WindIndex;
  /** Index into GameState.players of the current dealer. */
  dealerIndex: number;
  /** Which dealer this is within the current prevailing wind (1-4). */
  dealerSeatNumber: number;
  /** How many times the current dealer has repeated (0 = first hand as dealer, not a repeat). */
  repeatCount: number;
}

export interface Round {
  id: string;
  timestamp: number;
  isDraw: boolean;
  /** True for a manual "Adjust wind/dealer" entry rather than a played hand. */
  isAdjustment?: boolean;
  winnerId?: PlayerId;
  method?: WinMethod;
  discarderId?: PlayerId;
  /** Set for a false win (詐糊): this player declared a win they didn't have and pays every other player. */
  falseWinnerId?: PlayerId;
  faan?: number;
  payouts: Payout[];
  /** Wind/dealer state in effect while this hand was played (or, for an adjustment, before the change). */
  windBefore: WindState;
  /** Resulting wind/dealer state after this round (or the manually-set state, for an adjustment). */
  windAfter: WindState;
  /** Present when the faan was worked out with the calculator; absent for manually entered faan. */
  faanCalc?: FaanSelection;
  /** True once this round's outcome has been changed via the Round History editor. */
  edited?: boolean;
}

export interface GameState {
  id: string;
  createdAt: number;
  /** Set once the player ends the game; presence of this field means the game is over. */
  endedAt?: number;
  players: Player[];
  startingScores: Record<PlayerId, number>;
  ruleSet: RuleSet;
  /** Dollars per point; 0 means points-only, no money is shown. */
  moneyPerPoint: number;
  rounds: Round[];
}
