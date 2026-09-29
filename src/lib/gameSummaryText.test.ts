import { describe, expect, it } from "vitest";
import type { GameState, Payout, Player, Round, WindState } from "../types";
import { defaultRuleSet } from "./defaultRules";
import { buildGameSummaryText } from "./gameSummaryText";

const DUMMY_WIND: WindState = { prevailingWind: 0, dealerIndex: 0, dealerSeatNumber: 1, repeatCount: 0 };

function player(id: string, name: string): Player {
  return { id, name };
}

function round(opts: {
  winnerId?: string;
  faan?: number;
  isDraw?: boolean;
  payouts?: Payout[];
}): Round {
  return {
    id: `round-${Math.random()}`,
    timestamp: Date.now(),
    isDraw: opts.isDraw ?? false,
    winnerId: opts.winnerId,
    method: opts.winnerId ? "discard" : undefined,
    faan: opts.faan,
    payouts: opts.payouts ?? [],
    windBefore: DUMMY_WIND,
    windAfter: DUMMY_WIND,
  };
}

function adjustmentRound(): Round {
  return {
    id: `adj-${Math.random()}`,
    timestamp: Date.now(),
    isDraw: false,
    isAdjustment: true,
    payouts: [],
    windBefore: DUMMY_WIND,
    windAfter: DUMMY_WIND,
  };
}

function game(opts: {
  players: Player[];
  startingScores?: Record<string, number>;
  moneyPerPoint?: number;
  rounds: Round[];
  createdAt?: number;
}): GameState {
  const startingScores: Record<string, number> = {};
  opts.players.forEach((p) => {
    startingScores[p.id] = opts.startingScores?.[p.id] ?? 0;
  });
  return {
    id: "game-1",
    createdAt: opts.createdAt ?? Date.UTC(2026, 8, 28), // Sep 28, 2026
    players: opts.players,
    startingScores,
    ruleSet: defaultRuleSet(),
    moneyPerPoint: opts.moneyPerPoint ?? 0,
    rounds: opts.rounds,
  };
}

function expectedDate(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

describe("buildGameSummaryText", () => {
  it("formats a normal game with money", () => {
    const alex = player("alex", "Alex");
    const jordan = player("jordan", "Jordan");
    const sam = player("sam", "Sam");
    const taylor = player("taylor", "Taylor");
    const g = game({
      players: [alex, jordan, sam, taylor],
      moneyPerPoint: 0.25,
      rounds: [
        round({ winnerId: alex.id, faan: 8, payouts: [{ from: taylor.id, to: alex.id, amount: 150 }] }),
        round({ winnerId: jordan.id, faan: 5, payouts: [{ from: taylor.id, to: jordan.id, amount: 100 }] }),
        round({ winnerId: alex.id, faan: 3, payouts: [{ from: taylor.id, to: alex.id, amount: 50 }] }),
      ],
    });

    const text = buildGameSummaryText(g);

    expect(text).toBe(
      [
        `\u{1F004} Mahjong · ${expectedDate(g.createdAt)}`,
        "3 hands played",
        "",
        "\u{1F3C6} Leaderboard",
        "\u{1F947} Alex · +200 pts · +$50",
        "\u{1F948} Jordan · +100 pts · +$25",
        "\u{1F949} Sam · even",
        "4️⃣ Taylor · -300 pts · -$75",
        "",
        "\u{1F4B8} Payouts",
        "Taylor → Alex: $50",
        "Taylor → Jordan: $25",
        "",
        "⭐ Biggest hand: Alex, 8 faan",
      ].join("\n"),
    );
  });

  it("shows point transfers instead of money in a points-only game", () => {
    const alex = player("alex", "Alex");
    const jordan = player("jordan", "Jordan");
    const sam = player("sam", "Sam");
    const taylor = player("taylor", "Taylor");
    const g = game({
      players: [alex, jordan, sam, taylor],
      moneyPerPoint: 0,
      rounds: [
        round({ winnerId: alex.id, faan: 8, payouts: [{ from: taylor.id, to: alex.id, amount: 150 }] }),
        round({ winnerId: jordan.id, faan: 5, payouts: [{ from: taylor.id, to: jordan.id, amount: 100 }] }),
        round({ winnerId: alex.id, faan: 3, payouts: [{ from: taylor.id, to: alex.id, amount: 50 }] }),
      ],
    });

    const text = buildGameSummaryText(g);

    expect(text).toBe(
      [
        `\u{1F004} Mahjong · ${expectedDate(g.createdAt)}`,
        "3 hands played",
        "",
        "\u{1F3C6} Leaderboard",
        "\u{1F947} Alex · +200 pts",
        "\u{1F948} Jordan · +100 pts",
        "\u{1F949} Sam · even",
        "4️⃣ Taylor · -300 pts",
        "",
        "\u{1F4B8} Payouts",
        "Taylor → Alex: 200 pts",
        "Taylor → Jordan: 100 pts",
        "",
        "⭐ Biggest hand: Alex, 8 faan",
      ].join("\n"),
    );
  });

  it("shows 'even' with no pts/money for a player who broke even, and excludes them from payouts", () => {
    const p1 = player("p1", "P1");
    const p2 = player("p2", "P2");
    const p3 = player("p3", "P3");
    const p4 = player("p4", "P4");
    const g = game({
      players: [p1, p2, p3, p4],
      moneyPerPoint: 0,
      rounds: [
        round({ winnerId: p2.id, faan: 4, payouts: [{ from: p3.id, to: p2.id, amount: 25 }] }),
        round({ winnerId: p1.id, faan: 3, payouts: [{ from: p2.id, to: p1.id, amount: 25 }] }),
        round({ winnerId: p1.id, faan: 5, payouts: [{ from: p4.id, to: p1.id, amount: 20 }] }),
      ],
    });

    const text = buildGameSummaryText(g);

    expect(text).toContain("\u{1F947} P1 · +45 pts");
    expect(text).toContain("\u{1F948} P2 · even");
    expect(text).toContain("\u{1F949} P4 · -20 pts");
    expect(text).toContain("4️⃣ P3 · -25 pts");
    expect(text).toContain("P3 → P1: 25 pts");
    expect(text).toContain("P4 → P1: 20 pts");
    expect(text).not.toContain("P2 →");
    expect(text).not.toContain("→ P2");
    expect(text).toContain("⭐ Biggest hand: P1, 5 faan");
  });

  it("shows 'Everyone broke even' when nobody won or lost anything", () => {
    const players = [player("p1", "P1"), player("p2", "P2"), player("p3", "P3"), player("p4", "P4")];
    const g = game({ players, rounds: [] });

    const text = buildGameSummaryText(g);

    expect(text).toBe(
      [
        `\u{1F004} Mahjong · ${expectedDate(g.createdAt)}`,
        "0 hands played",
        "",
        "\u{1F3C6} Leaderboard",
        "\u{1F947} P1 · even",
        "\u{1F947} P2 · even",
        "\u{1F947} P3 · even",
        "\u{1F947} P4 · even",
        "",
        "\u{1F4B8} Payouts",
        "Everyone broke even \u{1F389}",
      ].join("\n"),
    );
    expect(text).not.toContain("Biggest hand");
  });

  it("skips a place for a tie at first (gold, gold, bronze, fourth)", () => {
    const w = player("w", "W");
    const x = player("x", "X");
    const y = player("y", "Y");
    const z = player("z", "Z");
    const g = game({
      players: [w, x, y, z],
      rounds: [
        round({ winnerId: w.id, faan: 3, payouts: [{ from: z.id, to: w.id, amount: 100 }] }),
        round({ winnerId: x.id, faan: 4, payouts: [{ from: z.id, to: x.id, amount: 100 }] }),
      ],
    });

    const text = buildGameSummaryText(g);
    const leaderboardLines = text.split("\n\n")[1].split("\n").slice(1);

    expect(leaderboardLines).toEqual([
      "\u{1F947} W · +100 pts",
      "\u{1F947} X · +100 pts",
      "\u{1F949} Y · even",
      "4️⃣ Z · -200 pts",
    ]);
    expect(text).toContain("⭐ Biggest hand: X, 4 faan");
  });

  it("uses net change, not the raw total, for a player with a non-zero starting score", () => {
    const p1 = player("p1", "P1");
    const p2 = player("p2", "P2");
    const p3 = player("p3", "P3");
    const p4 = player("p4", "P4");
    const g = game({
      players: [p1, p2, p3, p4],
      startingScores: { p1: 500 },
      rounds: [round({ winnerId: p2.id, faan: 3, payouts: [{ from: p1.id, to: p2.id, amount: 30 }] })],
    });

    const text = buildGameSummaryText(g);

    expect(text).toContain("1 hand played");
    expect(text).toContain("P2 · +30 pts");
    expect(text).toContain("P1 · -30 pts");
    expect(text).not.toContain("470");
    expect(text).not.toContain("500");
    expect(text).toContain("P1 → P2: 30 pts");
    expect(text).toContain("⭐ Biggest hand: P2, 3 faan");
  });

  it("omits the biggest-hand line when there are no winning hands, but still counts draws", () => {
    const players = [player("p1", "P1"), player("p2", "P2"), player("p3", "P3"), player("p4", "P4")];
    const g = game({
      players,
      rounds: [round({ isDraw: true }), adjustmentRound(), round({ isDraw: true })],
    });

    const text = buildGameSummaryText(g);

    expect(text).toContain("2 hands played");
    expect(text).not.toContain("Biggest hand");
    expect(text).toContain("Everyone broke even \u{1F389}");
  });
});
