import { describe, it, expect } from "vitest";
import {
  combinedDecimal,
  payout,
  profit,
  combinedProbIndependent,
  evPercent,
  evDollars,
  breakEvenProb,
  classifyEv,
  kellyFraction,
  kellySizing,
  longRunPnl,
} from "../ev";

describe("EV and parlay math", () => {
  it("combines decimal odds by multiplication", () => {
    expect(combinedDecimal([2.0, 2.0, 2.0])).toBeCloseTo(8.0, 10);
    expect(combinedDecimal([])).toBe(1);
  });

  it("computes payout and profit", () => {
    expect(payout(100, 8)).toBe(800);
    expect(profit(100, 8)).toBe(700);
  });

  it("multiplies independent leg probabilities", () => {
    expect(combinedProbIndependent([0.5, 0.5, 0.5])).toBeCloseTo(0.125, 10);
  });

  it("computes EV% as dec*p - 1", () => {
    // Fair coin at +100 (dec 2.0): EV = 0.
    expect(evPercent(2.0, 0.5)).toBeCloseTo(0, 10);
    // 60% at even money: +20% EV.
    expect(evPercent(2.0, 0.6)).toBeCloseTo(0.2, 10);
    // 40% at even money: -20% EV.
    expect(evPercent(2.0, 0.4)).toBeCloseTo(-0.2, 10);
  });

  it("computes EV in dollars", () => {
    expect(evDollars(100, 2.0, 0.6)).toBeCloseTo(20, 10);
  });

  it("break-even prob equals implied prob", () => {
    expect(breakEvenProb(4.0)).toBeCloseTo(0.25, 10);
  });

  it("classifies EV into buckets", () => {
    expect(classifyEv(0.05)).toBe("positive");
    expect(classifyEv(-0.05)).toBe("negative");
    expect(classifyEv(0)).toBe("neutral");
  });

  it("computes Kelly fraction f=(bp-q)/b", () => {
    // dec 2.0 (b=1), p=0.6, q=0.4 -> f = (0.6-0.4)/1 = 0.2.
    expect(kellyFraction(2.0, 0.6)).toBeCloseTo(0.2, 10);
    // -EV bet -> Kelly clamps to 0.
    expect(kellyFraction(2.0, 0.4)).toBe(0);
  });

  it("gives full/half/quarter Kelly", () => {
    const k = kellySizing(2.0, 0.6);
    expect(k.full).toBeCloseTo(0.2, 10);
    expect(k.half).toBeCloseTo(0.1, 10);
    expect(k.quarter).toBeCloseTo(0.05, 10);
  });

  it("projects long-run PnL over 100 bets", () => {
    expect(longRunPnl(100, 2.0, 0.6, 100)).toBeCloseTo(2000, 6);
  });
});
