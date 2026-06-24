// Elo / power-rating sanity check for moneyline probabilities. Lets the user
// cross-check a market-derived win probability against a ratings-based one.

/**
 * Win probability for team A vs team B from Elo ratings.
 *   P(A) = 1 / (1 + 10^(−(Ra − Rb + homeAdv)/400))
 * `homeAdv` is an optional Elo bump for A's home edge (~65 in the NFL, ~100 in
 * the NBA — sport-dependent; the user supplies it).
 */
export function eloWinProb(ratingA: number, ratingB: number, homeAdv = 0): number {
  const diff = ratingA - ratingB + homeAdv;
  return 1 / (1 + Math.pow(10, -diff / 400));
}

/** Convenience: Elo points implied by a win probability (inverse of above). */
export function probToEloDiff(p: number): number {
  const clamped = Math.min(0.999, Math.max(0.001, p));
  return -400 * Math.log10(1 / clamped - 1);
}
