import { describe, it, expect } from "vitest";
import {
  americanToDecimal,
  decimalToAmerican,
  fractionalToDecimal,
  decimalToFractional,
  decimalToImpliedProb,
  probToDecimal,
  parseOdds,
  parseFractional,
  formatOdds,
} from "../odds";

describe("odds conversions", () => {
  it("converts positive American to decimal", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 10);
    expect(americanToDecimal(100)).toBeCloseTo(2.0, 10);
  });

  it("converts negative American to decimal", () => {
    expect(americanToDecimal(-200)).toBeCloseTo(1.5, 10);
    expect(americanToDecimal(-110)).toBeCloseTo(1.9090909, 5);
  });

  it("round-trips decimal <-> American", () => {
    expect(decimalToAmerican(2.5)).toBe(150);
    expect(decimalToAmerican(1.5)).toBe(-200);
    expect(decimalToAmerican(2.0)).toBe(100);
  });

  it("rejects invalid American odds", () => {
    expect(() => americanToDecimal(0)).toThrow();
  });

  it("converts fractional to decimal", () => {
    expect(fractionalToDecimal(3, 2)).toBeCloseTo(2.5, 10);
    expect(fractionalToDecimal(1, 1)).toBeCloseTo(2.0, 10);
  });

  it("converts decimal to a clean fraction", () => {
    expect(decimalToFractional(2.5)).toEqual({ num: 3, den: 2 });
    expect(decimalToFractional(2.0)).toEqual({ num: 1, den: 1 });
  });

  it("computes implied probability and back", () => {
    expect(decimalToImpliedProb(2.0)).toBeCloseTo(0.5, 10);
    expect(decimalToImpliedProb(4.0)).toBeCloseTo(0.25, 10);
    expect(probToDecimal(0.25)).toBeCloseTo(4.0, 10);
  });

  it("parses each format", () => {
    expect(parseOdds("+150", "american")).toBeCloseTo(2.5, 10);
    expect(parseOdds("-200", "american")).toBeCloseTo(1.5, 10);
    expect(parseOdds("2.50", "decimal")).toBeCloseTo(2.5, 10);
    expect(parseOdds("3/2", "fractional")).toBeCloseTo(2.5, 10);
    expect(parseFractional("10/11")).toBeCloseTo(1.9090909, 5);
  });

  it("rejects bad parse inputs", () => {
    expect(() => parseOdds("50", "american")).toThrow();
    expect(() => parseOdds("0.5", "decimal")).toThrow();
    expect(() => parseOdds("abc", "fractional")).toThrow();
  });

  it("formats odds in each display format", () => {
    expect(formatOdds(2.5, "american")).toBe("+150");
    expect(formatOdds(1.5, "american")).toBe("-200");
    expect(formatOdds(2.5, "decimal")).toBe("2.50");
    expect(formatOdds(2.5, "fractional")).toBe("3/2");
    expect(formatOdds(NaN, "decimal")).toBe("—");
  });
});
