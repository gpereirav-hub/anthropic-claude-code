// Integration layer: turn the raw inputs (legs, correlations, settings) into a
// complete analysis the UI renders. This is where odds, vig removal, EV,
// correlation, Monte Carlo and risk all come together.

import type { CorrelationPair, Leg, ParlaySettings } from "./types";
import { legFairProb } from "./vig";
import {
  breakEvenProb,
  classifyEv,
  combinedDecimal,
  evDollars,
  evPercent,
  kellySizing,
  longRunPnl,
  payout,
  profit,
  type EvVerdict,
  type KellySizing,
} from "./ev";
import {
  correlatedCombinedProb,
  detectCorrelationMispricing,
  indexPairs,
} from "./correlation";
import { runMonteCarlo, type MonteCarloResult } from "./montecarlo";
import { bankrollGuardrail, parlayRisk, riskOfRuin } from "./risk";
import {
  bestAvailable,
  lineMovement,
  reverseLineMovement,
  type LineMovement,
} from "./market";

/** Clamp a probability away from the 0/1 boundaries. */
export function clampProb(p: number): number {
  return Math.min(0.999, Math.max(0.001, p));
}

export interface LegAnalysis {
  leg: Leg;
  postedDecimal: number;
  postedImplied: number;
  fairProb: number;
  fairDecimal: number;
  hold: number;
  overround: number;
  /** Sum of applied context nudges, in probability points. */
  nudgeTotal: number;
  /** Final true probability used for EV (override or fair, plus nudges). */
  trueProb: number;
  /** Whether the user override (not the market) set the base probability. */
  usedOverride: boolean;
  evPercent: number;
  evDollars: number;
  evClass: EvVerdict;
  bestBook: string;
  bestDecimal: number;
  shopImprovement: number;
  movement: LineMovement | null;
  rlm: boolean;
}

export interface ParlayAnalysis {
  legs: LegAnalysis[];
  activeCount: number;
  voidedCount: number;
  comboDecimal: number;
  stake: number;
  payout: number;
  profit: number;
  /** Book-implied parlay hit chance = product of posted implied probs. */
  postedCombinedProb: number;
  /** No-vig independent parlay probability = product of fair probs. */
  fairIndependentProb: number;
  /** True parlay probability incl. correlation + overrides + nudges. */
  trueProb: number;
  /** Independent product of the true (override/nudge) leg probs, no correlation. */
  trueIndependentProb: number;
  evPercent: number;
  evDollars: number;
  longRun100: number;
  breakEvenProb: number;
  /** Cumulative overround baked into the parlay price (compounded vig). */
  parlayOverround: number;
  /** The book's true edge on THIS parlay, as a percentage (= −EV%). */
  houseEdge: number;
  kelly: KellySizing;
  recommendedStake: number;
  risk: ReturnType<typeof parlayRisk>;
  riskOfRuin: number;
  guardrail: ReturnType<typeof bankrollGuardrail>;
  monteCarlo: MonteCarloResult;
  correlation: { mispriced: boolean; edge: number };
  settings: ParlaySettings;
}

/** Analyze a single leg in isolation. */
export function analyzeLeg(leg: Leg, settings: ParlaySettings): LegAnalysis {
  const devig = legFairProb(leg.decimalOdds, leg.marketSiblingsDecimal, settings.vigMethod);
  const fairProb = devig.fairProbs[0];
  const postedImplied = devig.rawProbs[0];

  const base = leg.trueProbOverride ?? fairProb;
  const nudgeTotal = leg.nudges.reduce((s, n) => s + n.delta, 0);
  const trueProb = clampProb(base + nudgeTotal);

  const ev = evPercent(leg.decimalOdds, trueProb);
  const shop = bestAvailable(leg);

  return {
    leg,
    postedDecimal: leg.decimalOdds,
    postedImplied,
    fairProb,
    fairDecimal: devig.fairDecimals[0],
    hold: devig.hold,
    overround: devig.overround,
    nudgeTotal,
    trueProb,
    usedOverride: leg.trueProbOverride !== undefined,
    evPercent: ev,
    // "If this leg were bet alone at the parlay stake" EV in dollars.
    evDollars: evDollars(settings.stake, leg.decimalOdds, trueProb),
    evClass: classifyEv(ev),
    bestBook: shop.best?.book ?? "Your book",
    bestDecimal: shop.best?.decimal ?? leg.decimalOdds,
    shopImprovement: shop.improvement,
    movement: lineMovement(leg),
    rlm: reverseLineMovement(leg),
  };
}

/** Full parlay analysis. */
export function analyzeParlay(
  allLegs: Leg[],
  pairs: CorrelationPair[],
  settings: ParlaySettings
): ParlayAnalysis {
  const active = allLegs.filter((l) => !l.voided);
  const voidedCount = allLegs.length - active.length;

  const legAnalyses = active.map((l) => analyzeLeg(l, settings));

  const decimals = legAnalyses.map((l) => l.postedDecimal);
  const postedImplieds = legAnalyses.map((l) => l.postedImplied);
  const fairProbs = legAnalyses.map((l) => l.fairProb);
  const trueProbs = legAnalyses.map((l) => l.trueProb);

  const comboDecimal = combinedDecimal(decimals);
  const stake = settings.stake;
  const pay = payout(stake, comboDecimal);
  const prof = profit(stake, comboDecimal);

  const postedCombinedProb = postedImplieds.reduce((a, b) => a * b, 1);
  const fairIndependentProb = fairProbs.reduce((a, b) => a * b, 1);
  const trueIndependentProb = trueProbs.reduce((a, b) => a * b, 1);

  // Correlation-adjusted true probability (authoritative for SGP).
  const idxPairs = indexPairs(active, pairs);
  const trueProb = clampProb(correlatedCombinedProb(trueProbs, idxPairs));

  const ev = evPercent(comboDecimal, trueProb);
  const evD = stake * ev;
  const breakEven = breakEvenProb(comboDecimal);
  const parlayOverround = fairIndependentProb > 0 ? postedCombinedProb / fairIndependentProb - 1 : 0;
  const houseEdge = -ev;

  const kelly = kellySizing(comboDecimal, trueProb);
  const recommendedStake = settings.bankroll * kelly.quarter;

  const risk = parlayRisk(stake, comboDecimal, trueProb);
  const ror = riskOfRuin(settings.bankroll, stake, trueProb, comboDecimal);
  const guardrail = bankrollGuardrail(stake, settings.bankroll, settings.maxStakeFraction);

  const monteCarlo = runMonteCarlo(
    trueProbs,
    idxPairs,
    stake,
    comboDecimal,
    settings.mcTrials
  );

  // Correlation mispricing: real (correlated) chance vs the independent product
  // of the no-vig fair legs (how a book that ignores correlation would price it).
  const correlation = detectCorrelationMispricing(
    trueProbs.reduce((a, b) => a * b, 1),
    trueProb
  );

  return {
    legs: legAnalyses,
    activeCount: active.length,
    voidedCount,
    comboDecimal,
    stake,
    payout: pay,
    profit: prof,
    postedCombinedProb,
    fairIndependentProb,
    trueProb,
    trueIndependentProb,
    evPercent: ev,
    evDollars: evD,
    longRun100: longRunPnl(stake, comboDecimal, trueProb, 100),
    breakEvenProb: breakEven,
    parlayOverround,
    houseEdge,
    kelly,
    recommendedStake,
    risk,
    riskOfRuin: ror,
    guardrail,
    monteCarlo,
    correlation,
    settings,
  };
}
