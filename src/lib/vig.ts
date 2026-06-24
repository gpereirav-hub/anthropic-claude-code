// Vig / juice removal. A sportsbook's posted prices imply probabilities that
// sum to more than 100%; the excess is the book's margin (overround). To get a
// fair read on a bet we strip that margin out.
//
// Three methods are offered because they distribute the vig differently —
// which matters a lot for favorites vs. longshots:
//   - multiplicative (normalization): proportional, simplest, slightly
//       over-taxes favorites.
//   - Shin: models a fraction of insider money; pulls more vig off longshots,
//       correcting the favorite–longshot bias.
//   - power/logarithmic: finds an exponent so prices^k sum to 1.

import type { VigMethod } from "./types";
import { decimalToImpliedProb } from "./odds";

export interface MarketDevig {
  /** Raw implied probabilities, p_i = 1/dec_i (sum to booksum > 1). */
  rawProbs: number[];
  /** No-vig fair probabilities (sum to 1). */
  fairProbs: number[];
  /** Fair decimal odds, 1 / fairProb. */
  fairDecimals: number[];
  /** Σ rawProbs — the booksum (e.g. 1.05 means a 5% overround). */
  booksum: number;
  /** Overround = booksum − 1. */
  overround: number;
  /** Hold = overround / booksum — the book's theoretical margin on handle. */
  hold: number;
  /** Shin's insider proportion z, when the Shin method is used. */
  z?: number;
}

/** Generic 1-D bisection root finder on a monotone-ish function. */
function bisect(
  f: (x: number) => number,
  lo: number,
  hi: number,
  iters = 80
): number {
  let flo = f(lo);
  let fhi = f(hi);
  // If the root isn't bracketed, return the endpoint closest to zero.
  if (flo === 0) return lo;
  if (fhi === 0) return hi;
  if (Math.sign(flo) === Math.sign(fhi)) {
    return Math.abs(flo) < Math.abs(fhi) ? lo : hi;
  }
  let mid = (lo + hi) / 2;
  for (let i = 0; i < iters; i++) {
    mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0) return mid;
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else {
      hi = mid;
      fhi = fm;
    }
  }
  return mid;
}

/** Multiplicative / normalization method: fair_p_i = raw_p_i / Σ raw_p. */
function devigMultiplicative(raw: number[], booksum: number): number[] {
  return raw.map((p) => p / booksum);
}

/**
 * Shin's method. Solves for the insider proportion z ∈ (0,1) such that the
 * recovered probabilities sum to 1:
 *   p_i(z) = ( sqrt(z² + 4(1−z)·o_i²/B) − z ) / ( 2(1−z) )
 * where o_i = raw implied prob and B = booksum. Pulls more vig from longshots.
 */
function devigShin(raw: number[], booksum: number): { probs: number[]; z: number } {
  const pAt = (z: number): number[] => {
    if (z <= 0) return raw.map((o) => o / booksum); // z→0 limit = multiplicative
    return raw.map((o) => {
      const inner = z * z + (4 * (1 - z) * o * o) / booksum;
      return (Math.sqrt(inner) - z) / (2 * (1 - z));
    });
  };
  const sumMinus1 = (z: number) => pAt(z).reduce((s, p) => s + p, 0) - 1;
  // f(0) = booksum − 1 ≥ 0; f increases-then the sum drops below 1 as z→1.
  const z = bisect(sumMinus1, 1e-9, 1 - 1e-9);
  const probs = pAt(z);
  // Renormalize against tiny numerical drift.
  const s = probs.reduce((a, b) => a + b, 0);
  return { probs: probs.map((p) => p / s), z };
}

/**
 * Power / logarithmic method. Finds exponent k such that Σ o_i^k = 1, then
 * fair_p_i = o_i^k. Because each o_i < 1, raising to k > 1 shrinks the sum
 * from the booksum down to exactly 1.
 */
function devigPower(raw: number[]): number[] {
  const sumPow = (k: number) => raw.reduce((s, o) => s + Math.pow(o, k), 0) - 1;
  // k = 1 gives the booksum (> 1); larger k shrinks the sum toward 0.
  const k = bisect(sumPow, 0.5, 20);
  const probs = raw.map((o) => Math.pow(o, k));
  const s = probs.reduce((a, b) => a + b, 0);
  return probs.map((p) => p / s);
}

/**
 * Strip the vig from one market given the decimal odds of every outcome.
 * `decimals[0]` is treated as the leg of interest; the rest are the opposing
 * side(s) used only to size the overround.
 */
export function devigMarket(
  decimals: number[],
  method: VigMethod
): MarketDevig {
  const raw = decimals.map(decimalToImpliedProb);
  const booksum = raw.reduce((a, b) => a + b, 0);
  const overround = booksum - 1;
  const hold = overround / booksum;

  let fairProbs: number[];
  let z: number | undefined;
  switch (method) {
    case "shin": {
      const r = devigShin(raw, booksum);
      fairProbs = r.probs;
      z = r.z;
      break;
    }
    case "power":
      fairProbs = devigPower(raw);
      break;
    case "multiplicative":
    default:
      fairProbs = devigMultiplicative(raw, booksum);
      break;
  }

  return {
    rawProbs: raw,
    fairProbs,
    fairDecimals: fairProbs.map((p) => (p > 0 ? 1 / p : Infinity)),
    booksum,
    overround,
    hold,
    z,
  };
}

/**
 * Fair probability for a single leg. When only the leg's own price is known
 * (no opposing side), we cannot measure the overround, so we fall back to a
 * flat per-leg vig assumption (default 4.5% removed proportionally) so the
 * fair number is at least directionally honest rather than equal to posted.
 */
export function legFairProb(
  legDecimal: number,
  siblingsDecimal: number[],
  method: VigMethod,
  fallbackVig = 0.045
): MarketDevig {
  if (siblingsDecimal.length > 0) {
    return devigMarket([legDecimal, ...siblingsDecimal], method);
  }
  // Single-side fallback: synthesize an opposing price implying the booksum is
  // (1 + fallbackVig) larger than a fair two-way book would be.
  const raw = decimalToImpliedProb(legDecimal);
  const fair = raw / (1 + fallbackVig);
  return {
    rawProbs: [raw],
    fairProbs: [fair],
    fairDecimals: [fair > 0 ? 1 / fair : Infinity],
    booksum: 1 + fallbackVig,
    overround: fallbackVig,
    hold: fallbackVig / (1 + fallbackVig),
  };
}
