// Monte Carlo simulation of a parlay using a Gaussian copula so that
// correlations between legs are honoured (not just multiplied marginals).
//
// Method: draw correlated standard normals via Cholesky, then convert each to
// a Bernoulli hit by thresholding at the marginal quantile Φ⁻¹(p_i). The leg
// hits when its latent normal falls below that threshold, giving P(hit)=p_i
// while preserving the dependence structure encoded in the correlation matrix.

import { mulberry32, normalInvCDF, randNormal, percentile } from "./stats";

export interface MonteCarloResult {
  trials: number;
  /** Simulated probability the whole parlay hits. */
  hitRate: number;
  /** 95% confidence interval on the hit rate (binomial normal approx). */
  ci95: [number, number];
  /** Mean profit per trial in currency for the supplied stake. */
  meanProfit: number;
  /** Profit standard deviation across trials. */
  profitStdDev: number;
  /** 5th and 95th percentile profit outcomes. */
  p05: number;
  p95: number;
  /** Histogram of profit outcomes for charting. */
  histogram: { label: string; value: number; count: number }[];
}

/** Cholesky factorization; returns null if the matrix is not positive-definite. */
function cholesky(m: number[][]): number[][] | null {
  const n = m.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = m[i][j];
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      if (i === j) {
        if (sum <= 0) return null; // not PD
        L[i][j] = Math.sqrt(sum);
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }
  return L;
}

/**
 * Build a valid correlation matrix from pairwise rhos. If the raw matrix is not
 * positive-definite (inconsistent user correlations), shrink the off-diagonals
 * toward zero until Cholesky succeeds. Returns the lower-triangular factor.
 */
function correlationFactor(
  n: number,
  pairs: { i: number; j: number; rho: number }[]
): number[][] {
  const build = (scale: number): number[][] => {
    const m: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j): number => (i === j ? 1 : 0))
    );
    for (const { i, j, rho } of pairs) {
      const r = Math.max(-0.999, Math.min(0.999, rho * scale));
      m[i][j] = r;
      m[j][i] = r;
    }
    return m;
  };
  for (let scale = 1; scale >= 0; scale -= 0.05) {
    const L = cholesky(build(scale));
    if (L) return L;
  }
  // Fully independent fallback (identity).
  return cholesky(build(0))!;
}

/**
 * Run the parlay Monte Carlo.
 * @param legProbs  marginal true probabilities per leg
 * @param pairs     index-based correlation pairs
 * @param stake     wager
 * @param comboDecimal  combined decimal odds (payout multiple)
 * @param trials    number of simulated parlays
 * @param seed      RNG seed for reproducibility
 */
export function runMonteCarlo(
  legProbs: number[],
  pairs: { i: number; j: number; rho: number }[],
  stake: number,
  comboDecimal: number,
  trials = 10000,
  seed = 0xc0ffee
): MonteCarloResult {
  const n = legProbs.length;
  const rng = mulberry32(seed);
  const thresholds = legProbs.map((p) => normalInvCDF(Math.min(1 - 1e-9, Math.max(1e-9, p))));
  const L = correlationFactor(n, pairs);

  let hits = 0;
  const win = stake * comboDecimal - stake; // profit when parlay hits
  const loss = -stake; // when it misses
  let sumProfit = 0;
  let sumSq = 0;
  const profits: number[] = new Array(trials);

  const z = new Array(n).fill(0);
  for (let t = 0; t < trials; t++) {
    // Independent standard normals.
    for (let i = 0; i < n; i++) z[i] = randNormal(rng);
    // Correlate via L: x = L·z. Leg i hits when x_i ≤ threshold_i.
    let allHit = true;
    for (let i = 0; i < n; i++) {
      let xi = 0;
      for (let k = 0; k <= i; k++) xi += L[i][k] * z[k];
      if (xi > thresholds[i]) {
        allHit = false;
        break;
      }
    }
    const profit = allHit ? win : loss;
    if (allHit) hits++;
    profits[t] = profit;
    sumProfit += profit;
    sumSq += profit * profit;
  }

  const hitRate = trials > 0 ? hits / trials : 0;
  const meanProfit = sumProfit / Math.max(1, trials);
  const variance = sumSq / Math.max(1, trials) - meanProfit * meanProfit;
  const profitStdDev = Math.sqrt(Math.max(0, variance));
  const se = Math.sqrt((hitRate * (1 - hitRate)) / Math.max(1, trials));

  const sorted = [...profits].sort((a, b) => a - b);

  // Two-bucket histogram (loss vs win) — a parlay is all-or-nothing.
  const lossCount = trials - hits;
  const histogram = [
    { label: `Lose (−$${stake.toFixed(0)})`, value: loss, count: lossCount },
    { label: `Win (+$${win.toFixed(0)})`, value: win, count: hits },
  ];

  return {
    trials,
    hitRate,
    ci95: [Math.max(0, hitRate - 1.96 * se), Math.min(1, hitRate + 1.96 * se)],
    meanProfit,
    profitStdDev,
    p05: percentile(sorted, 0.05),
    p95: percentile(sorted, 0.95),
    histogram,
  };
}
