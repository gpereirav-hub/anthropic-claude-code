// Correlation engine. Naive parlay math multiplies leg probabilities as if
// they were independent. In a same-game parlay they rarely are: "QB over
// passing yards" and "team total over" move together. Positive correlation
// raises the true joint probability above the independent product; negative
// correlation lowers it.

import type { BetType, CorrelationPair, Leg } from "./types";

/**
 * Joint probability of two correlated Bernoulli events.
 *   Cov(A,B) = rho · sqrt(pA·qA·pB·qB)
 *   P(A∩B)   = pA·pB + Cov(A,B)
 * clamped to the Fréchet bounds [max(0, pA+pB−1), min(pA,pB)].
 */
export function jointProbPair(pA: number, pB: number, rho: number): number {
  const qA = 1 - pA;
  const qB = 1 - pB;
  const cov = rho * Math.sqrt(Math.max(0, pA * qA * pB * qB));
  const joint = pA * pB + cov;
  const lo = Math.max(0, pA + pB - 1);
  const hi = Math.min(pA, pB);
  return Math.min(hi, Math.max(lo, joint));
}

/**
 * Analytic correlation-adjusted combined probability for N legs.
 * Exact for two legs. For more, we start from the independent product and
 * apply each correlated pair's "lift" factor joint/(pA·pB). This is an
 * approximation — the Monte Carlo Gaussian-copula run is the authoritative
 * number — but it is fast and directionally correct for the live readout.
 */
export function correlatedCombinedProb(
  legProbs: number[],
  pairs: { i: number; j: number; rho: number }[]
): number {
  let combined = legProbs.reduce((a, b) => a * b, 1);
  for (const { i, j, rho } of pairs) {
    if (rho === 0) continue;
    const pA = legProbs[i];
    const pB = legProbs[j];
    if (pA <= 0 || pB <= 0) continue;
    const joint = jointProbPair(pA, pB, rho);
    const lift = joint / (pA * pB);
    combined *= lift;
  }
  return Math.min(1, Math.max(0, combined));
}

/** Build an index-based pair list from id-based correlation pairs. */
export function indexPairs(
  legs: Leg[],
  pairs: CorrelationPair[]
): { i: number; j: number; rho: number }[] {
  const idx = new Map(legs.map((l, k) => [l.id, k]));
  const out: { i: number; j: number; rho: number }[] = [];
  for (const p of pairs) {
    const i = idx.get(p.a);
    const j = idx.get(p.b);
    if (i === undefined || j === undefined || i === j) continue;
    out.push({ i, j, rho: p.rho });
  }
  return out;
}

export interface CorrelationSuggestion {
  rho: number;
  note: string;
}

/**
 * Heuristic correlation suggestion for a pair of legs in the SAME game.
 * These are documented estimates, not measured values — the UI must say so.
 * Returns null when no strong prior applies.
 */
export function suggestCorrelation(a: Leg, b: Leg): CorrelationSuggestion | null {
  if (a.league !== b.league) return null;
  const types = new Set<BetType>([a.betType, b.betType]);
  const text = `${a.selection} ${b.selection}`.toLowerCase();

  const mentionsOver = /\bover\b/.test(text);
  const mentionsUnder = /\bunder\b/.test(text);
  const bothOver = (a.selection + b.selection).toLowerCase().split("over").length - 1 >= 2;

  // Player prop "over" + team/game total "over": positively correlated — more
  // individual production tends to come in higher-scoring games.
  if (
    (types.has("player_prop") && types.has("total")) ||
    (types.has("player_prop") && types.has("team_prop"))
  ) {
    if (mentionsOver && !mentionsUnder) {
      return {
        rho: 0.35,
        note: "Player production and game/team scoring rise together — positively correlated. Estimate.",
      };
    }
    if (mentionsOver && mentionsUnder) {
      return {
        rho: -0.3,
        note: "An 'over' paired with an 'under' on the same scoring environment tends to conflict — negatively correlated. Estimate.",
      };
    }
  }

  // Moneyline favorite + that team's spread cover: strongly positive.
  if (types.has("moneyline") && types.has("spread")) {
    return {
      rho: 0.45,
      note: "Winning the game and covering the spread overlap heavily — strongly positive. Estimate.",
    };
  }

  // Team win + team total UNDER: a grind-it-out win lowers scoring — mild negative.
  if (types.has("moneyline") && types.has("team_prop") && mentionsUnder) {
    return {
      rho: -0.2,
      note: "A low-scoring win is plausible but the win usually means scoring — mild negative. Estimate.",
    };
  }

  // Two 'overs' in the same game: positively correlated scoring environment.
  if (bothOver) {
    return {
      rho: 0.25,
      note: "Two overs share the same high-scoring script — positively correlated. Estimate.",
    };
  }

  return null;
}

/**
 * Detect when a book is mispricing correlation: a positively correlated SGP
 * whose true joint probability exceeds the price implied by treating legs as
 * independent. That gap is where genuine +EV in SGPs hides.
 */
export function detectCorrelationMispricing(
  independentProb: number,
  correlatedProb: number
): { mispriced: boolean; edge: number } {
  // edge > 0 means the real chance beats the independent (book-style) chance.
  const edge = correlatedProb - independentProb;
  return { mispriced: edge > 0.01, edge };
}
