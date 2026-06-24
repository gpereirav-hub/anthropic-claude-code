import { describe, it, expect } from "vitest";
import {
  jointProbPair,
  correlatedCombinedProb,
  detectCorrelationMispricing,
} from "../correlation";

describe("correlation engine", () => {
  it("independent joint equals product when rho=0", () => {
    expect(jointProbPair(0.5, 0.5, 0)).toBeCloseTo(0.25, 10);
  });

  it("positive correlation raises joint above the product", () => {
    expect(jointProbPair(0.5, 0.5, 0.5)).toBeGreaterThan(0.25);
  });

  it("negative correlation lowers joint below the product", () => {
    expect(jointProbPair(0.5, 0.5, -0.5)).toBeLessThan(0.25);
  });

  it("respects Fréchet bounds", () => {
    // Perfect correlation can't exceed min(pA,pB).
    expect(jointProbPair(0.3, 0.7, 1)).toBeLessThanOrEqual(0.3 + 1e-9);
    // Can't go below max(0, pA+pB-1).
    expect(jointProbPair(0.7, 0.7, -1)).toBeGreaterThanOrEqual(0.4 - 1e-9);
  });

  it("combined prob with no pairs equals the independent product", () => {
    const p = correlatedCombinedProb([0.5, 0.5, 0.5], []);
    expect(p).toBeCloseTo(0.125, 10);
  });

  it("positive correlation lifts the combined probability", () => {
    const indep = correlatedCombinedProb([0.5, 0.5], []);
    const corr = correlatedCombinedProb([0.5, 0.5], [{ i: 0, j: 1, rho: 0.5 }]);
    expect(corr).toBeGreaterThan(indep);
  });

  it("detects correlation mispricing when correlated beats independent", () => {
    const d = detectCorrelationMispricing(0.2, 0.26);
    expect(d.mispriced).toBe(true);
    expect(d.edge).toBeCloseTo(0.06, 10);
    expect(detectCorrelationMispricing(0.2, 0.2).mispriced).toBe(false);
  });
});
