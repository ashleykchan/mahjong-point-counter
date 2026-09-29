import type { FaanSelection, HandPattern, HandPatternSection, Round, RuleSet, WinMethod } from "../types";

export const SECTION_LABELS: Record<HandPatternSection, string> = {
  everyday: "Everyday hands",
  bigger: "Bigger hands",
  limit: "Limit hands",
};

export const SECTION_ORDER: HandPatternSection[] = ["everyday", "bigger", "limit"];

const DRAGON_PUNGS = ["redDragon", "greenDragon", "whiteDragon"];
const WIND_PUNGS = ["seatWind", "roundWind"];

function check(
  id: string,
  name: string,
  chineseName: string,
  faan: number,
  description: string,
  section: HandPatternSection,
  extra: Partial<HandPattern> = {},
): HandPattern {
  return { id, name, chineseName, faan, description, section, kind: "check", enabled: true, ...extra };
}

function limit(id: string, name: string, chineseName: string, description: string, extra: Partial<HandPattern> = {}) {
  return check(id, name, chineseName, 0, description, "limit", extra);
}

const DEFAULT_HAND_PATTERNS: HandPattern[] = [
  check("selfDrawn", "Self-drawn", "自摸", 1, "Drew the winning tile yourself", "everyday", { auto: "self-draw" }),
  check("concealed", "Concealed hand", "門前清", 1, "No melds claimed from discards, won off a discard", "everyday"),
  check("allChows", "All chows", "平胡", 1, "All sequences plus a pair, no pungs", "everyday", {
    excludes: ["allPungs", ...DRAGON_PUNGS, ...WIND_PUNGS],
  }),
  check("noFlowers", "No flowers", "無花", 1, "Won with no flower or season tiles", "everyday", {
    excludes: ["seatFlower", "flowerSet"],
  }),
  check("seatFlower", "Seat flower", "正花", 1, "Flower or season matching your seat", "everyday", {
    kind: "count",
    maxCount: 2,
  }),
  check("flowerSet", "Full set of flowers", "一台花", 2, "All four flowers or all four seasons", "everyday", {
    kind: "count",
    maxCount: 2,
  }),
  check("redDragon", "Red dragon pung", "紅中", 1, "Pung or kong of red dragons", "everyday"),
  check("greenDragon", "Green dragon pung", "發財", 1, "Pung or kong of green dragons", "everyday"),
  check("whiteDragon", "White dragon pung", "白板", 1, "Pung or kong of white dragons", "everyday"),
  check("seatWind", "Seat wind pung", "門風", 1, "Pung of your own seat wind", "everyday"),
  check("roundWind", "Round wind pung", "圈風", 1, "Pung of the prevailing wind", "everyday"),
  check("lastTile", "Win on the last tile", "海底撈月", 1, "Won on the very last tile of the wall", "everyday"),
  check("kongWin", "Win after a kong", "槓上開花", 1, "Won on the replacement tile after a kong", "everyday"),
  check("robKong", "Robbing a kong", "搶槓", 1, "Won off a tile someone added to make a kong", "everyday"),

  check("allPungs", "All pungs", "對對胡", 3, "Four pungs or kongs plus a pair", "bigger"),
  check("mixedSuit", "Mixed one suit", "混一色", 3, "One suit plus honor tiles", "bigger", { excludes: ["fullSuit"] }),
  check("sevenPairs", "Seven pairs", "七對子", 4, "Seven different pairs, fully concealed", "bigger", {
    includes: ["concealed"],
    excludes: [
      "allChows",
      "allPungs",
      ...DRAGON_PUNGS,
      ...WIND_PUNGS,
      "smallDragons",
      "bigDragons",
      "smallWinds",
      "bigWinds",
      "fourConcealed",
      "allKongs",
      "thirteenOrphans",
      "nineGates",
    ],
  }),
  check("smallDragons", "Small three dragons", "小三元", 5, "Two dragon pungs plus a dragon pair", "bigger", {
    includes: DRAGON_PUNGS,
    excludes: ["bigDragons"],
  }),
  check("smallWinds", "Small four winds", "小四喜", 6, "Three wind pungs plus a wind pair", "bigger", {
    includes: WIND_PUNGS,
    excludes: ["bigWinds"],
  }),
  check("fullSuit", "Full one suit", "清一色", 7, "Entire hand in one suit, no honors", "bigger"),
  check("bigDragons", "Big three dragons", "大三元", 8, "Pungs of all three dragons", "bigger", { includes: DRAGON_PUNGS }),
  check("fourConcealed", "Four concealed pungs", "坎坎胡", 8, "Four pungs all formed without claiming", "bigger"),

  limit("allHonors", "All honors", "字一色", "Only wind and dragon tiles"),
  limit("bigWinds", "Big four winds", "大四喜", "Pungs of all four winds", { includes: WIND_PUNGS }),
  limit("thirteenOrphans", "Thirteen orphans", "十三么", "One of each terminal and honor, plus one duplicate"),
  limit("pureTerminals", "Pure terminals", "清么九", "Only 1s and 9s"),
  limit("nineGates", "Nine gates", "九子連環", "1112345678999 in one suit plus any tile of that suit"),
  limit("allKongs", "All kongs", "十八羅漢", "Four kongs plus a pair"),
  limit("heavenlyHand", "Heavenly hand", "天胡", "Dealer wins on the starting deal"),
  limit("earthlyHand", "Earthly hand", "地胡", "Non-dealer wins on the dealer's first discard"),
];

export function defaultHandPatterns(): HandPattern[] {
  return structuredClone(DEFAULT_HAND_PATTERNS);
}

/** The rule set's pattern list, falling back to the defaults for rule sets saved before the calculator existed. */
export function patternsFor(ruleSet: RuleSet): HandPattern[] {
  return ruleSet.handPatterns ?? DEFAULT_HAND_PATTERNS;
}

export function withHandPatterns(ruleSet: RuleSet): RuleSet {
  return ruleSet.handPatterns ? ruleSet : { ...ruleSet, handPatterns: defaultHandPatterns() };
}

export function emptySelection(): FaanSelection {
  return { counts: {}, adjustment: 0 };
}

/**
 * How a ticked pattern `active` blocks `target`. Excludes work both ways; includes only one way, so ticking
 * Red dragon pung still leaves Big three dragons free to pick (picking it then unticks the pung).
 */
function blocks(active: HandPattern, target: HandPattern): "includes" | "excludes" | null {
  if (active.includes?.includes(target.id)) return "includes";
  if (active.excludes?.includes(target.id) || target.excludes?.includes(active.id)) return "excludes";
  return null;
}

function related(a: HandPattern, b: HandPattern): boolean {
  return blocks(a, b) !== null || blocks(b, a) !== null;
}

function isActive(pattern: HandPattern, selection: FaanSelection): boolean {
  return pattern.enabled && (selection.counts[pattern.id] ?? 0) > 0;
}

/** Why a pattern can't be scored given what's already ticked, or null if it's free to pick. */
export function blockedReason(patterns: HandPattern[], selection: FaanSelection, id: string): string | null {
  const target = patterns.find((p) => p.id === id);
  if (!target) return null;
  for (const other of patterns) {
    if (other.id === id || !isActive(other, selection)) continue;
    const kind = blocks(other, target);
    if (kind === "includes") return `Included in ${other.name}`;
    if (kind === "excludes") return `Can't combine with ${other.name}`;
  }
  return null;
}

/** Sets a pattern's count; ticking a pattern unticks everything it conflicts with. */
export function setPatternCount(
  patterns: HandPattern[],
  selection: FaanSelection,
  id: string,
  count: number,
): FaanSelection {
  const target = patterns.find((p) => p.id === id);
  if (!target) return selection;
  const max = target.kind === "count" ? (target.maxCount ?? 1) : 1;
  const clamped = Math.min(Math.max(count, 0), max);
  const counts = { ...selection.counts };
  if (clamped === 0) {
    delete counts[id];
  } else {
    counts[id] = clamped;
    for (const other of patterns) {
      if (other.id !== id && related(target, other)) delete counts[other.id];
    }
  }
  return { ...selection, counts };
}

/** Ticks or unticks the patterns that follow from the win method (e.g. Self-drawn). */
export function applyWinMethod(
  patterns: HandPattern[],
  selection: FaanSelection,
  method: WinMethod | null,
): FaanSelection {
  let next = selection;
  for (const p of patterns) {
    if (p.auto !== "self-draw") continue;
    const want = p.enabled && method === "self-draw" ? 1 : 0;
    if ((next.counts[p.id] ?? 0) !== want) next = setPatternCount(patterns, next, p.id, want);
  }
  return next;
}

export interface FaanLine {
  pattern: HandPattern;
  count: number;
  faan: number;
}

export interface FaanResult {
  lines: FaanLine[];
  /** A ticked limit hand, which sets the total to the rule set's max faan. */
  limitPattern: HandPattern | null;
  /** Sum before capping (never negative). */
  raw: number;
  /** What the hand scores: raw capped at the rule set's max faan. */
  total: number;
  capped: boolean;
  belowMin: boolean;
}

export function calculateFaan(ruleSet: RuleSet, selection: FaanSelection): FaanResult {
  const patterns = patternsFor(ruleSet);
  const lines: FaanLine[] = [];
  let limitPattern: HandPattern | null = null;
  for (const p of patterns) {
    if (!isActive(p, selection)) continue;
    const count = selection.counts[p.id];
    if (p.section === "limit") {
      limitPattern ??= p;
      lines.push({ pattern: p, count, faan: ruleSet.maxFaan });
    } else {
      lines.push({ pattern: p, count, faan: p.faan * count });
    }
  }

  const raw = limitPattern
    ? ruleSet.maxFaan
    : Math.max(0, lines.reduce((sum, l) => sum + l.faan, 0) + selection.adjustment);
  const total = Math.min(raw, ruleSet.maxFaan);
  return {
    lines,
    limitPattern,
    raw,
    total,
    capped: !limitPattern && raw > ruleSet.maxFaan,
    belowMin: total < ruleSet.minFaan,
  };
}

/** One-line breakdown, e.g. "Full one suit 7 · All pungs 3 · Seat flower ×1 1 = 11 faan". */
export function describeCalculation(ruleSet: RuleSet, selection: FaanSelection): string {
  const result = calculateFaan(ruleSet, selection);
  if (result.limitPattern) {
    const names = result.lines.filter((l) => l.pattern.section === "limit").map((l) => l.pattern.name);
    return `${names.join(" · ")} (limit) = ${result.total} faan`;
  }
  const biggestFirst = [...result.lines].sort((a, b) => b.faan - a.faan);
  const parts = biggestFirst.map((l) =>
    l.pattern.kind === "count" ? `${l.pattern.name} ×${l.count} ${l.faan}` : `${l.pattern.name} ${l.faan}`,
  );
  if (selection.adjustment !== 0) {
    parts.push(`Adjustment ${selection.adjustment > 0 ? "+" : ""}${selection.adjustment}`);
  }
  return `${parts.join(" · ") || "Nothing ticked"} = ${result.total} faan${result.capped ? " (capped)" : ""}`;
}

export type FaanInputMode = "manual" | "automatic";

export interface FaanInputState {
  mode: FaanInputMode;
  selection: FaanSelection;
}

/** How Edit Round opens: calculated rounds reopen in the calculator with the same boxes ticked; manual rounds stay manual. */
export function initialFaanInput(round: Round, rememberedMode: FaanInputMode): FaanInputState {
  if (round.faanCalc) return { mode: "automatic", selection: structuredClone(round.faanCalc) };
  if (!round.isDraw) return { mode: "manual", selection: emptySelection() };
  return { mode: rememberedMode, selection: emptySelection() };
}
