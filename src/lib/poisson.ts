// Poisson modelling for goal/score-based markets (soccer especially, also
// useful for low-event totals). Goals scored by a team in a match are well
// approximated by a Poisson process with rate λ ≈ expected goals (xG).

/** Poisson pmf: P(X = k) = e^(−λ) · λ^k / k!. */
export function poissonPmf(lambda: number, k: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  // Compute via logs for numerical stability at larger k.
  let logFact = 0;
  for (let i = 2; i <= k; i++) logFact += Math.log(i);
  return Math.exp(-lambda + k * Math.log(lambda) - logFact);
}

/** P(X ≤ k). */
export function poissonCdf(lambda: number, k: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i++) sum += poissonPmf(lambda, i);
  return Math.min(1, sum);
}

/**
 * Probability the combined goals of two independent Poisson teams (rates
 * lambdaHome, lambdaAway) exceeds `line` — i.e. an Over bet on the match total.
 * Total goals of two independent Poissons is Poisson(λh+λa), so we sum the
 * tail above the line. Half-point lines (2.5) avoid pushes.
 */
export function totalOverProb(lambdaHome: number, lambdaAway: number, line: number): number {
  const lambda = lambdaHome + lambdaAway;
  // Need P(total > line). For a 2.5 line that's P(total ≥ 3) = 1 − CDF(2).
  const threshold = Math.floor(line); // largest integer total that is "under"
  return 1 - poissonCdf(lambda, threshold);
}

/** Convenience: P(total < line) (the Under). */
export function totalUnderProb(lambdaHome: number, lambdaAway: number, line: number): number {
  return 1 - totalOverProb(lambdaHome, lambdaAway, line);
}

export interface MatchOutcomeProbs {
  homeWin: number;
  draw: number;
  awayWin: number;
}

/**
 * 1X2 outcome probabilities from two independent Poisson scorelines, summing
 * over a grid of plausible scores (0..maxGoals each).
 */
export function matchOutcomeProbs(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 10
): MatchOutcomeProbs {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  for (let h = 0; h <= maxGoals; h++) {
    const ph = poissonPmf(lambdaHome, h);
    for (let a = 0; a <= maxGoals; a++) {
      const p = ph * poissonPmf(lambdaAway, a);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }
  return { homeWin, draw, awayWin };
}
