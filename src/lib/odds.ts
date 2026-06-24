// Odds conversions. Every public function is pure and unit-tested.
//
// Three formats are supported:
//   - American:   +150 (underdog), -200 (favorite)
//   - Decimal:    2.50  (total return per 1 unit staked, stake included)
//   - Fractional: 3/2   (profit per stake, stake NOT included)

import type { OddsFormat } from "./types";

/** True when a finite number that is usable as decimal odds (> 1). */
export function isValidDecimal(dec: number): boolean {
  return Number.isFinite(dec) && dec > 1;
}

/**
 * American → decimal.
 *   positive: dec = (odds / 100) + 1
 *   negative: dec = (100 / |odds|) + 1
 * American odds cannot be between -100 and +100 (exclusive); 0 is invalid.
 */
export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || american === 0) {
    throw new Error("Invalid American odds");
  }
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

/**
 * Decimal → American.
 *   dec >= 2.0 → positive: (dec - 1) * 100
 *   dec <  2.0 → negative: -100 / (dec - 1)
 */
export function decimalToAmerican(dec: number): number {
  if (!isValidDecimal(dec)) throw new Error("Invalid decimal odds");
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
}

/** Fractional (numerator/denominator) → decimal. dec = num/den + 1. */
export function fractionalToDecimal(num: number, den: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0 || num <= 0) {
    throw new Error("Invalid fractional odds");
  }
  return num / den + 1;
}

/**
 * Decimal → fractional, reduced to lowest terms.
 * Approximates the (dec-1) profit ratio with a small denominator search so
 * the display stays human-friendly (e.g. 2.5 → "3/2", 1.91 → "10/11").
 */
export function decimalToFractional(dec: number): { num: number; den: number } {
  if (!isValidDecimal(dec)) throw new Error("Invalid decimal odds");
  const profit = dec - 1;
  // Search denominators up to 100 for the closest simple fraction.
  let best = { num: 1, den: 1, err: Infinity };
  for (let den = 1; den <= 100; den++) {
    const num = Math.round(profit * den);
    if (num <= 0) continue;
    const err = Math.abs(num / den - profit);
    if (err < best.err - 1e-12) best = { num, den, err };
    if (err < 1e-9) break;
  }
  const g = gcd(best.num, best.den);
  return { num: best.num / g, den: best.den / g };
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Parse a fractional string like "3/2" into a decimal. */
export function parseFractional(input: string): number {
  const m = input.trim().match(/^(\d+(?:\.\d+)?)\s*[/:]\s*(\d+(?:\.\d+)?)$/);
  if (!m) throw new Error("Expected fractional like 3/2");
  return fractionalToDecimal(parseFloat(m[1]), parseFloat(m[2]));
}

/**
 * Parse a user-entered odds string in any supported format into decimal.
 * `format` disambiguates ambiguous cases (e.g. "200" could be American or a
 * nonsensical decimal); when "fractional" we require the a/b form.
 */
export function parseOdds(input: string, format: OddsFormat): number {
  const raw = input.trim();
  if (raw === "") throw new Error("Empty odds");

  if (format === "fractional") return parseFractional(raw);

  const n = Number(raw.replace(/^\+/, ""));
  if (!Number.isFinite(n)) throw new Error("Not a number");

  if (format === "american") {
    // American magnitudes are >= 100; reject the dead zone.
    if (Math.abs(n) < 100) throw new Error("American odds must be ≥ 100 in magnitude");
    return americanToDecimal(n);
  }
  // decimal
  if (n <= 1) throw new Error("Decimal odds must be > 1");
  return n;
}

/** Implied probability from decimal odds: p = 1 / dec. */
export function decimalToImpliedProb(dec: number): number {
  if (!isValidDecimal(dec)) throw new Error("Invalid decimal odds");
  return 1 / dec;
}

/** Decimal odds from a probability: dec = 1 / p. */
export function probToDecimal(p: number): number {
  if (!(p > 0 && p < 1)) throw new Error("Probability must be in (0,1)");
  return 1 / p;
}

/** Format a decimal odds value in the requested display format as a string. */
export function formatOdds(dec: number, format: OddsFormat): string {
  if (!isValidDecimal(dec)) return "—";
  switch (format) {
    case "american": {
      const a = decimalToAmerican(dec);
      return a > 0 ? `+${a}` : `${a}`;
    }
    case "decimal":
      return dec.toFixed(2);
    case "fractional": {
      const { num, den } = decimalToFractional(dec);
      return `${num}/${den}`;
    }
  }
}
