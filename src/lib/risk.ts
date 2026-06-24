// Bankroll and risk-management math: parlay variance, risk of ruin, and
// bankroll-fraction guardrails.

import { mulberry32 } from "./stats";

export interface ParlayRisk {
  evDollars: number;
  /** Standard deviation of a single placement's profit, in currency. */
  stdDev: number;
  variance: number;
  /** stdDev / stake — the swing size relative to the wager. */
  volatilityRatio: number;
  swingLabel: "Low" | "Moderate" | "High" | "Extreme";
}

/**
 * Mean/variance/std-dev of profit for a single all-or-nothing parlay bet.
 *   win  profit = (combo − 1)·stake with probability p
 *   lose profit = −stake          with probability (1 − p)
 */
export function parlayRisk(stake: number, comboDecimal: number, p: number): ParlayRisk {
  const winProfit = (comboDecimal - 1) * stake;
  const loseProfit = -stake;
  const mean = p * winProfit + (1 - p) * loseProfit;
  const variance = p * (winProfit - mean) ** 2 + (1 - p) * (loseProfit - mean) ** 2;
  const stdDev = Math.sqrt(Math.max(0, variance));
  const volatilityRatio = stake > 0 ? stdDev / stake : 0;

  let swingLabel: ParlayRisk["swingLabel"];
  if (volatilityRatio < 1) swingLabel = "Low";
  else if (volatilityRatio < 3) swingLabel = "Moderate";
  else if (volatilityRatio < 8) swingLabel = "High";
  else swingLabel = "Extreme";

  return { evDollars: mean, stdDev, variance, volatilityRatio, swingLabel };
}

/**
 * Risk of ruin via simulation. Repeatedly place the same parlay at a fixed
 * unit stake and count the fraction of runs whose bankroll falls below one
 * unit within `bets` placements. For −EV bets this trends toward 1; for thin
 * +EV with huge variance it can still be alarmingly high.
 */
export function riskOfRuin(
  bankroll: number,
  stake: number,
  p: number,
  comboDecimal: number,
  bets = 500,
  runs = 3000,
  seed = 0x1234abcd
): number {
  if (stake <= 0 || bankroll <= 0) return 0;
  const rng = mulberry32(seed);
  const winProfit = (comboDecimal - 1) * stake;
  let ruined = 0;
  for (let r = 0; r < runs; r++) {
    let bank = bankroll;
    for (let i = 0; i < bets; i++) {
      if (bank < stake) {
        ruined++;
        break;
      }
      bank += rng() < p ? winProfit : -stake;
    }
  }
  return ruined / runs;
}

export interface BankrollGuardrail {
  fractionOfBankroll: number;
  exceedsThreshold: boolean;
  recommendedMaxStake: number;
}

/** Check a stake against the sane bankroll-fraction threshold. */
export function bankrollGuardrail(
  stake: number,
  bankroll: number,
  maxFraction: number
): BankrollGuardrail {
  const fractionOfBankroll = bankroll > 0 ? stake / bankroll : Infinity;
  return {
    fractionOfBankroll,
    exceedsThreshold: fractionOfBankroll > maxFraction,
    recommendedMaxStake: bankroll * maxFraction,
  };
}
