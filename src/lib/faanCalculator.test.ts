import { describe, expect, it } from "vitest";
import type { FaanSelection, GameState, Round, WindState } from "../types";
import { defaultRuleSet } from "./defaultRules";
import {
  applyWinMethod,
  blockedReason,
  calculateFaan,
  describeCalculation,
  emptySelection,
  initialFaanInput,
  patternsFor,
  setPatternCount,
  withHandPatterns,
} from "./faanCalculator";
import { computePayouts } from "./scoring";
import { withEditedRound } from "./rounds";

const ruleSet = defaultRuleSet(); // 3-13 faan
const patterns = patternsFor(ruleSet);

/** Ticks patterns in order, the way a player tapping rows would. */
function tick(...entries: (string | [string, number])[]): FaanSelection {
  return entries.reduce<FaanSelection>((sel, entry) => {
    const [id, count] = typeof entry === "string" ? [entry, 1] : entry;
    return setPatternCount(patterns, sel, id, count);
  }, emptySelection());
}

describe("calculateFaan", () => {
  it("adds up a simple 3-faan hand", () => {
    const sel = applyWinMethod(patterns, tick("allChows", "noFlowers"), "self-draw");
    const result = calculateFaan(ruleSet, sel);
    expect(result.total).toBe(3);
    expect(result.belowMin).toBe(false);
  });

  it("stacks separate dragon pungs", () => {
    expect(calculateFaan(ruleSet, tick("redDragon", "greenDragon")).total).toBe(2);
  });

  it("counts two seat flowers as 2 faan", () => {
    expect(calculateFaan(ruleSet, tick(["seatFlower", 2])).total).toBe(2);
  });

  it("doesn't double-count dragon pungs inside Big three dragons", () => {
    const sel = tick("redDragon", "greenDragon", "whiteDragon", "bigDragons");
    expect(sel.counts).toEqual({ bigDragons: 1 });
    expect(calculateFaan(ruleSet, sel).total).toBe(8);
    expect(blockedReason(patterns, sel, "redDragon")).toBe("Included in Big three dragons");
  });

  it("scores Seven pairs + Full one suit as 11, dropping the included Concealed hand", () => {
    const sel = tick("concealed", "sevenPairs", "fullSuit");
    expect(sel.counts.concealed).toBeUndefined();
    expect(calculateFaan(ruleSet, sel).total).toBe(11);
    expect(blockedReason(patterns, sel, "concealed")).toBe("Included in Seven pairs");
    expect(blockedReason(patterns, sel, "allPungs")).toBe("Can't combine with Seven pairs");
  });

  it("returns the rule set's max faan for a limit hand", () => {
    const result = calculateFaan(ruleSet, tick("thirteenOrphans"));
    expect(result.total).toBe(ruleSet.maxFaan);
    expect(result.limitPattern?.id).toBe("thirteenOrphans");
    expect(result.capped).toBe(false);
  });

  it("caps the total at the max faan", () => {
    // 7 + 3 + 8 + 1 = 19 raw
    const result = calculateFaan(ruleSet, tick("fullSuit", "allPungs", "fourConcealed", "lastTile"));
    expect(result.raw).toBe(19);
    expect(result.total).toBe(13);
    expect(result.capped).toBe(true);
  });

  it("flags totals under the minimum and applies the manual adjustment", () => {
    const sel = tick("redDragon");
    expect(calculateFaan(ruleSet, sel).belowMin).toBe(true);
    expect(calculateFaan(ruleSet, { ...sel, adjustment: 2 }).total).toBe(3);
  });
});

describe("win-method patterns", () => {
  it("ticks Self-drawn only for a self-drawn win", () => {
    const drawn = applyWinMethod(patterns, emptySelection(), "self-draw");
    expect(drawn.counts.selfDrawn).toBe(1);
    expect(applyWinMethod(patterns, drawn, "discard").counts.selfDrawn).toBeUndefined();
  });
});

describe("describeCalculation", () => {
  it("lists each pattern with its faan", () => {
    const sel = tick("fullSuit", "allPungs", ["seatFlower", 1]);
    expect(describeCalculation(ruleSet, sel)).toBe("Full one suit 7 · All pungs 3 · Seat flower ×1 1 = 11 faan");
  });
});

describe("withHandPatterns", () => {
  it("gives rule sets saved before the calculator the default pattern list", () => {
    const { handPatterns: _, ...legacy } = defaultRuleSet();
    expect(withHandPatterns(legacy).handPatterns?.length).toBe(patterns.length);
  });
});

describe("reopening a calculated round in Edit Round", () => {
  const wind: WindState = { prevailingWind: 0, dealerIndex: 0, dealerSeatNumber: 1, repeatCount: 0 };
  const players = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
    { id: "d", name: "D" },
  ];

  function gameWith(round: Round): GameState {
    return {
      id: "g",
      createdAt: 0,
      players,
      startingScores: { a: 0, b: 0, c: 0, d: 0 },
      ruleSet,
      moneyPerPoint: 0,
      rounds: [round],
    };
  }

  it("restores the same ticked patterns, counts and adjustment", () => {
    const faanCalc: FaanSelection = { ...tick("sevenPairs", "fullSuit", ["seatFlower", 2]), adjustment: 1 };
    const faan = calculateFaan(ruleSet, faanCalc).total;
    const round: Round = {
      id: "r1",
      timestamp: 0,
      isDraw: false,
      winnerId: "a",
      method: "discard",
      discarderId: "b",
      faan,
      faanCalc,
      payouts: computePayouts(ruleSet, players, "a", "discard", faan, "b"),
      windBefore: wind,
      windAfter: wind,
    };

    // Saving from Edit Round keeps the calculator inputs on the round...
    const [saved] = withEditedRound(gameWith(round), "r1", {
      isDraw: false,
      winnerId: "a",
      method: "discard",
      discarderId: "b",
      faan,
      faanCalc,
    });
    expect(saved.faanCalc).toEqual(faanCalc);

    // ...and opening it again comes back in Automatic mode with the same boxes ticked.
    const reopened = initialFaanInput(saved, "manual");
    expect(reopened.mode).toBe("automatic");
    expect(reopened.selection).toEqual({ counts: { sevenPairs: 1, fullSuit: 1, seatFlower: 2 }, adjustment: 1 });
    expect(calculateFaan(ruleSet, reopened.selection).total).toBe(13);
    expect(reopened.selection).not.toBe(saved.faanCalc);
  });

  it("keeps manually entered rounds in Manual mode", () => {
    const round: Round = {
      id: "r1",
      timestamp: 0,
      isDraw: false,
      winnerId: "a",
      method: "self-draw",
      faan: 5,
      payouts: [],
      windBefore: wind,
      windAfter: wind,
    };
    expect(initialFaanInput(round, "automatic").mode).toBe("manual");
  });
});
