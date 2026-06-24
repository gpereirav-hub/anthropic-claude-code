// Expected value, parlay combination, break-even and Kelly math.
// All pure functions, formulas in comments.

/** Combined parlay decimal odds = product of leg decimal odds. */
export function combinedDecimal(legDecimals: number[]): number {
  if (legDecimals.length === 0) return 1;
  return legDecimals.reduce((a, b) => a * b, 1);
}

/** payout = stake × combined_decimal (includes stake back). */
export function payout(stake: number, comboDecimal: number): number {
  return stake * comboDecimal;
}

/** profit = payout − stake. */
export function profit(stake: number, comboDecimal: number): number {
  return payout(stake, comboDecimal) - stake;
}

/**
 * Combined probability of independent legs = product of leg probabilities.
 * (Correlation adjustments live in correlation.ts and replace this when SGP.)
 */
export function combinedProbIndependent(legProbs: number[]): number {
  return legProbs.reduce((a, b) => a * b, 1);
}

/**
 * EV% of a single bet:  EV% = decimal_odds × true_prob − 1.
 * Positive means the bet returns more than its stake on average.
 */
export function evPercent(decimalOdds: number, trueProb: number): number {
  return decimalOdds * trueProb - 1;
}

/** EV in currency for a given stake. */
export function evDollars(stake: number, decimalOdds: number, trueProb: number): number {
  return stake * evPercent(decimalOdds, trueProb);
}

/**
 * Break-even win probability for a price: the true probability at which EV = 0.
 * From EV% = dec·p − 1 = 0  ⇒  p = 1/dec, i.e. the implied probability.
 */
export function breakEvenProb(decimalOdds: number): number {
  return 1 / decimalOdds;
}

export type EvVerdict = "positive" | "neutral" | "negative";

/** Classify an EV% into a colour bucket, with a small neutral dead-band. */
export function classifyEv(ev: number, band = 0.005): EvVerdict {
  if (ev > band) return "positive";
  if (ev < -band) return "negative";
  return "neutral";
}

/**
 * Kelly fraction of bankroll to stake:
 *   f* = (b·p − q) / b      where b = dec − 1, p = true prob, q = 1 − p.
 * Equivalent to (edge / odds). Negative ⇒ no bet. We never return < 0.
 */
export function kellyFraction(decimalOdds: number, trueProb: number): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  const q = 1 - trueProb;
  const f = (b * trueProb - q) / b;
  return Math.max(0, f);
}

export interface KellySizing {
  full: number;
  half: number;
  quarter: number;
}

/** Full / half / quarter Kelly fractions. Quarter is the safe default. */
export function kellySizing(decimalOdds: number, trueProb: number): KellySizing {
  const full = kellyFraction(decimalOdds, trueProb);
  return { full, half: full / 2, quarter: full / 4 };
}

/**
 * Long-run expected profit/loss over N identical placements of `stake`.
 * Just N × EV$; the law of large numbers makes this the realistic average.
 */
export function longRunPnl(
  stake: number,
  decimalOdds: number,
  trueProb: number,
  n = 100
): number {
  return n * evDollars(stake, decimalOdds, trueProb);
}
