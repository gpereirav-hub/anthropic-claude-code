import { describe, it, expect } from "vitest";
import { analyzeParlay } from "../analyze";
import { buildVerdict } from "../verdict";
import { sampleLegs, defaultSettings } from "../../state";
import type { CorrelationPair } from "../types";

describe("end-to-end parlay analysis", () => {
  const legs = sampleLegs();

  it("produces finite, sane numbers for the sample parlay", () => {
    const a = analyzeParlay(legs, [], defaultSettings);
    expect(a.activeCount).toBe(3);
    expect(Number.isFinite(a.comboDecimal)).toBe(true);
    expect(a.comboDecimal).toBeGreaterThan(1);
    expect(a.payout).toBeCloseTo(defaultSettings.stake * a.comboDecimal, 6);
    expect(a.trueProb).toBeGreaterThan(0);
    expect(a.trueProb).toBeLessThan(1);
    expect(Number.isFinite(a.evPercent)).toBe(true);
    // The book's posted combined prob must exceed the no-vig fair prob.
    expect(a.postedCombinedProb).toBeGreaterThan(a.fairIndependentProb);
    // Compounded vig is positive and material across 3 vig'd legs.
    expect(a.parlayOverround).toBeGreaterThan(0);
    // Monte Carlo hit rate should be in the neighbourhood of the analytic true prob.
    expect(Math.abs(a.monteCarlo.hitRate - a.trueProb)).toBeLessThan(0.05);
  });

  it("a market-priced parlay (no overrides) is −EV — the house wins", () => {
    const a = analyzeParlay(legs, [], defaultSettings);
    // With fair probs from the market and vig on top, EV must be negative.
    expect(a.evPercent).toBeLessThan(0);
    expect(a.houseEdge).toBeGreaterThan(0);
    const v = buildVerdict(a);
    expect(["Negative EV — Skip", "Sucker Bet", "Coinflip / Neutral"]).toContain(v.badge);
  });

  it("an optimistic override flips the verdict positive", () => {
    const boosted = legs.map((l) => ({ ...l, trueProbOverride: 0.9 }));
    const a = analyzeParlay(boosted, [], defaultSettings);
    expect(a.evPercent).toBeGreaterThan(0);
    expect(a.kelly.full).toBeGreaterThan(0);
  });

  it("positive correlation raises the true prob above the independent product", () => {
    const pairs: CorrelationPair[] = [{ a: legs[1].id, b: legs[2].id, rho: 0.5 }];
    const a = analyzeParlay(legs, pairs, { ...defaultSettings, sgpMode: true });
    expect(a.trueProb).toBeGreaterThan(a.trueIndependentProb);
  });

  it("voiding a leg removes it and recomputes", () => {
    const withVoid = legs.map((l, i) => (i === 0 ? { ...l, voided: true } : l));
    const a = analyzeParlay(withVoid, [], defaultSettings);
    expect(a.activeCount).toBe(2);
    expect(a.voidedCount).toBe(1);
  });

  it("handles a single-leg parlay", () => {
    const a = analyzeParlay([legs[0]], [], defaultSettings);
    expect(a.activeCount).toBe(1);
    expect(a.comboDecimal).toBeCloseTo(legs[0].decimalOdds, 6);
  });
});
