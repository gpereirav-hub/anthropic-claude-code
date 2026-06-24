import { describe, it, expect } from "vitest";
import { runMonteCarlo } from "../montecarlo";

describe("Monte Carlo simulation", () => {
  it("recovers the independent product hit rate", () => {
    // Two independent 50% legs -> ~25% combined.
    const r = runMonteCarlo([0.5, 0.5], [], 100, 4.0, 40000, 12345);
    expect(r.hitRate).toBeGreaterThan(0.23);
    expect(r.hitRate).toBeLessThan(0.27);
  });

  it("positive correlation increases the simulated hit rate", () => {
    const indep = runMonteCarlo([0.5, 0.5], [], 100, 4.0, 40000, 99);
    const corr = runMonteCarlo(
      [0.5, 0.5],
      [{ i: 0, j: 1, rho: 0.6 }],
      100,
      4.0,
      40000,
      99
    );
    expect(corr.hitRate).toBeGreaterThan(indep.hitRate + 0.02);
  });

  it("is reproducible for a fixed seed", () => {
    const a = runMonteCarlo([0.4, 0.6, 0.5], [], 50, 8, 20000, 7);
    const b = runMonteCarlo([0.4, 0.6, 0.5], [], 50, 8, 20000, 7);
    expect(a.hitRate).toBe(b.hitRate);
  });

  it("produces a sensible confidence interval bracketing the hit rate", () => {
    const r = runMonteCarlo([0.5], [], 100, 2.0, 20000, 3);
    expect(r.ci95[0]).toBeLessThanOrEqual(r.hitRate);
    expect(r.ci95[1]).toBeGreaterThanOrEqual(r.hitRate);
  });

  it("handles inconsistent correlations without crashing (shrinks to PD)", () => {
    // Three legs all maximally correlated is not a valid PD matrix; should still run.
    const r = runMonteCarlo(
      [0.5, 0.5, 0.5],
      [
        { i: 0, j: 1, rho: 0.99 },
        { i: 0, j: 2, rho: 0.99 },
        { i: 1, j: 2, rho: -0.99 },
      ],
      100,
      8,
      10000,
      1
    );
    expect(Number.isFinite(r.hitRate)).toBe(true);
    expect(r.hitRate).toBeGreaterThanOrEqual(0);
    expect(r.hitRate).toBeLessThanOrEqual(1);
  });
});
