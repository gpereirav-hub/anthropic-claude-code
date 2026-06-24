// Shared domain types for the parlay analyzer.

export type OddsFormat = "american" | "decimal" | "fractional";

export type League =
  | "NFL"
  | "NCAAF"
  | "NBA"
  | "NCAAB"
  | "MLB"
  | "NHL"
  | "Soccer"
  | "Tennis"
  | "MMA"
  | "Golf"
  | "Racing"
  | "Other";

export type BetType =
  | "moneyline"
  | "spread"
  | "total"
  | "player_prop"
  | "team_prop"
  | "alt_line"
  | "futures";

export type VigMethod = "multiplicative" | "shin" | "power";

/** A single odds quote at one book for one leg. Used for line shopping. */
export interface BookQuote {
  book: string;
  /** Decimal odds at this book. */
  decimal: number;
}

/** A situational context nudge the user applied to a leg's true probability. */
export interface ContextNudge {
  id: string;
  label: string;
  /** Additive nudge to the leg's true probability, in probability points
   *  (e.g. +0.03 = +3 percentage points). Clamped on apply. */
  delta: number;
  reason: string;
}

export interface Leg {
  id: string;
  league: League;
  betType: BetType;
  selection: string;
  /** The posted decimal odds at the book the user is actually betting. */
  decimalOdds: number;
  /**
   * The other side(s) of this leg's market, as decimal odds. Used to compute
   * the market overround and strip vig. For a two-way market this is the
   * single opposing price; empty means we fall back to a single-side estimate.
   */
  marketSiblingsDecimal: number[];
  /** Optional user override of the true hit probability (0..1). */
  trueProbOverride?: number;
  /** Situational nudges applied on top of the fair/override probability. */
  nudges: ContextNudge[];
  /** Same-leg prices at other books, for line shopping. */
  bookQuotes: BookQuote[];
  /** Line movement since open, in the leg's native odds points (informational). */
  openingDecimalOdds?: number;
  /** Public betting percentage on this selection, 0..100 (for RLM detection). */
  publicBetPct?: number;
  /** Whether this leg pushed/voided — removed from the parlay when true. */
  voided: boolean;
}

export interface CorrelationPair {
  /** Leg ids, order-independent. */
  a: string;
  b: string;
  /** Pearson-style correlation coefficient in [-1, 1]. */
  rho: number;
  /** True when auto-suggested rather than user-set. */
  suggested?: boolean;
  note?: string;
}

export interface ParlaySettings {
  stake: number;
  bankroll: number;
  /** Max sane stake as a fraction of bankroll (e.g. 0.02 = 2%). */
  maxStakeFraction: number;
  vigMethod: VigMethod;
  displayFormat: OddsFormat;
  /** True for same-game parlay mode (correlation matters). */
  sgpMode: boolean;
  /** Monte Carlo trial count. */
  mcTrials: number;
}
