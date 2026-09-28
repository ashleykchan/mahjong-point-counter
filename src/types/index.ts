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
  faan?: number;
  payouts: Payout[];
  /** Wind/dealer state in effect while this hand was played (or, for an adjustment, before the change). */
  windBefore: WindState;
  /** Resulting wind/dealer state after this round (or the manually-set state, for an adjustment). */
  windAfter: WindState;
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
