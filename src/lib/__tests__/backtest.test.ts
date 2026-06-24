import { describe, it, expect } from "vitest";
import { parseBacktestCsv } from "../backtest";

describe("backtest CSV parsing", () => {
  it("parses a simple tracker export", () => {
    const csv = [
      "date,stake,odds,result",
      "2024-01-01,100,2.0,win",
      "2024-01-02,100,2.0,loss",
      "2024-01-03,100,3.0,win",
      "2024-01-04,100,2.0,push",
    ].join("\n");
    const s = parseBacktestCsv(csv);
    expect(s.bets).toBe(4);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.pushes).toBe(1);
    // profit: +100, -100, +200, 0 = +200; staked 400 -> ROI 0.5
    expect(s.totalProfit).toBeCloseTo(200, 6);
    expect(s.roi).toBeCloseTo(0.5, 6);
    // hit rate over decided bets (3) = 2/3
    expect(s.hitRate).toBeCloseTo(2 / 3, 6);
  });

  it("tolerates header synonyms and varied result tokens", () => {
    const csv = ["wager,price,outcome", "50,1.91,won", "50,1.91,lost"].join("\n");
    const s = parseBacktestCsv(csv);
    expect(s.bets).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
  });

  it("reports an error on missing columns", () => {
    const s = parseBacktestCsv("foo,bar\n1,2");
    expect(s.errors.length).toBeGreaterThan(0);
    expect(s.bets).toBe(0);
  });

  it("skips malformed rows but keeps good ones", () => {
    const csv = ["stake,odds,result", "100,2.0,win", "bad,row,here", "100,2.0,loss"].join("\n");
    const s = parseBacktestCsv(csv);
    expect(s.bets).toBe(2);
    expect(s.errors.length).toBeGreaterThan(0);
  });
});
