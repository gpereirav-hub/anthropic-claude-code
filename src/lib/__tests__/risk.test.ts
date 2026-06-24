import { describe, it, expect } from "vitest";
import { parlayRisk, riskOfRuin, bankrollGuardrail } from "../risk";
import { eloWinProb, probToEloDiff } from "../elo";

describe("risk management", () => {
  it("computes parlay mean equal to EV$", () => {
    // dec 4.0, p=0.25 -> fair, EV=0.
    const r = parlayRisk(100, 4.0, 0.25);
    expect(r.evDollars).toBeCloseTo(0, 6);
    expect(r.stdDev).toBeGreaterThan(0);
  });

  it("labels longshot parlays as high/extreme variance", () => {
    const r = parlayRisk(100, 50, 0.02);
    expect(r.volatilityRatio).toBeGreaterThan(3);
    expect(["High", "Extreme"]).toContain(r.swingLabel);
  });

  it("risk of ruin is higher for -EV than +EV bets", () => {
    const evNeg = riskOfRuin(1000, 50, 0.2, 4.0, 300, 1500, 42); // -EV (fair 0.25)
    const evPos = riskOfRuin(1000, 50, 0.3, 4.0, 300, 1500, 42); // +EV
    expect(evNeg).toBeGreaterThan(evPos);
  });

  it("flags stakes above the bankroll guardrail", () => {
    const g = bankrollGuardrail(50, 1000, 0.02);
    expect(g.fractionOfBankroll).toBeCloseTo(0.05, 9);
    expect(g.exceedsThreshold).toBe(true);
    expect(g.recommendedMaxStake).toBeCloseTo(20, 9);
  });
});

describe("elo sanity check", () => {
  it("equal ratings give 50%", () => {
    expect(eloWinProb(1500, 1500)).toBeCloseTo(0.5, 9);
  });

  it("home advantage raises win prob", () => {
    expect(eloWinProb(1500, 1500, 65)).toBeGreaterThan(0.5);
  });

  it("round-trips prob <-> elo diff", () => {
    const diff = probToEloDiff(0.75);
    expect(eloWinProb(1500 + diff, 1500)).toBeCloseTo(0.75, 6);
  });
});
