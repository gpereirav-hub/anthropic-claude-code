import { describe, it, expect } from "vitest";
import { devigMarket, legFairProb } from "../vig";

describe("vig removal", () => {
  // A standard -110 / -110 two-way market: each side decimal 1.909..., booksum ~1.0476.
  const dec110 = 100 / 110 + 1; // 1.90909

  it("computes overround and hold for a -110/-110 market", () => {
    const r = devigMarket([dec110, dec110], "multiplicative");
    expect(r.booksum).toBeCloseTo(1.0476, 3);
    expect(r.overround).toBeCloseTo(0.0476, 3);
    expect(r.hold).toBeCloseTo(0.0455, 3);
  });

  it("multiplicative method yields fair probs summing to 1", () => {
    const r = devigMarket([dec110, dec110], "multiplicative");
    const sum = r.fairProbs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    // Symmetric market → 50/50 fair.
    expect(r.fairProbs[0]).toBeCloseTo(0.5, 9);
  });

  it("all three methods sum to 1 on an asymmetric market", () => {
    const dec = [1.5, 3.0]; // favorite/underdog, booksum = 0.6667 + 0.3333 = 1.0
    // Make it have real vig:
    const market = [1.45, 2.75];
    for (const m of ["multiplicative", "shin", "power"] as const) {
      const r = devigMarket(market, m);
      const sum = r.fairProbs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 6);
      expect(r.fairProbs[0]).toBeGreaterThan(0);
      expect(r.fairProbs[0]).toBeLessThan(1);
    }
    expect(dec).toBeDefined();
  });

  it("Shin removes more vig from the longshot than multiplicative", () => {
    const market = [1.4, 3.2]; // heavy favorite + longshot, with vig
    const mult = devigMarket(market, "multiplicative");
    const shin = devigMarket(market, "shin");
    // Shin gives the favorite a HIGHER fair prob than naive normalization
    // (it attributes more of the longshot's price to vig).
    expect(shin.fairProbs[0]).toBeGreaterThan(mult.fairProbs[0]);
    expect(shin.z).toBeGreaterThan(0);
  });

  it("fair odds are the reciprocal of fair probability", () => {
    const r = devigMarket([dec110, dec110], "multiplicative");
    expect(r.fairDecimals[0]).toBeCloseTo(1 / r.fairProbs[0], 9);
    expect(r.fairDecimals[0]).toBeCloseTo(2.0, 6);
  });

  it("falls back to a flat vig when no opposing side is given", () => {
    const r = legFairProb(2.0, [], "multiplicative", 0.045);
    expect(r.fairProbs[0]).toBeCloseTo(0.5 / 1.045, 6);
    expect(r.overround).toBeCloseTo(0.045, 9);
  });
});
