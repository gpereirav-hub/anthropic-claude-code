import { describe, it, expect } from "vitest";
import {
  poissonPmf,
  poissonCdf,
  totalOverProb,
  totalUnderProb,
  matchOutcomeProbs,
} from "../poisson";

describe("Poisson goal model", () => {
  it("pmf matches known values", () => {
    // P(X=0 | λ=1) = e^-1 ≈ 0.3679
    expect(poissonPmf(1, 0)).toBeCloseTo(0.36788, 4);
    // P(X=2 | λ=2) = e^-2 * 2^2 / 2 = 0.2707
    expect(poissonPmf(2, 2)).toBeCloseTo(0.27067, 4);
  });

  it("cdf accumulates correctly", () => {
    expect(poissonCdf(1, 0)).toBeCloseTo(0.36788, 4);
    expect(poissonCdf(2, 10)).toBeCloseTo(1, 3);
  });

  it("over and under probs sum to 1 across a half line", () => {
    const over = totalOverProb(1.4, 1.2, 2.5);
    const under = totalUnderProb(1.4, 1.2, 2.5);
    expect(over + under).toBeCloseTo(1, 9);
    expect(over).toBeGreaterThan(0);
    expect(over).toBeLessThan(1);
  });

  it("1X2 outcome probabilities sum to ~1", () => {
    const o = matchOutcomeProbs(1.6, 1.1);
    const sum = o.homeWin + o.draw + o.awayWin;
    expect(sum).toBeCloseTo(1, 4);
    // Stronger home rate -> home win most likely.
    expect(o.homeWin).toBeGreaterThan(o.awayWin);
  });
});
