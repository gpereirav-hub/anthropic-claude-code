// Verdict / recommendation engine. Synthesizes the full analysis into one
// honest readout: a badge, the parlay's true house edge, its single biggest
// weakness, a blunt one-liner, and concrete suggestions to improve the ticket.

import type { ParlayAnalysis } from "./analyze";

export type VerdictBadge =
  | "Strong +EV"
  | "Marginal +EV"
  | "Coinflip / Neutral"
  | "Negative EV — Skip"
  | "Sucker Bet";

export interface Verdict {
  badge: VerdictBadge;
  tone: "good" | "warn" | "bad";
  /** Blunt one-line summary. */
  oneLiner: string;
  /** The single biggest weakness dragging the ticket down. */
  biggestWeakness: string | null;
  /** Concrete suggestions to improve the ticket. */
  suggestions: string[];
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function oneInX(p: number): string {
  if (p <= 0) return "∞";
  return `1 in ${(1 / p).toFixed(1)}`;
}

export function buildVerdict(a: ParlayAnalysis): Verdict {
  const ev = a.evPercent;
  const legs = a.legs.length;

  let badge: VerdictBadge;
  let tone: Verdict["tone"];
  if (ev >= 0.05) {
    badge = "Strong +EV";
    tone = "good";
  } else if (ev > 0.005) {
    badge = "Marginal +EV";
    tone = "good";
  } else if (ev >= -0.02) {
    badge = "Coinflip / Neutral";
    tone = "warn";
  } else if (ev >= -0.12) {
    badge = "Negative EV — Skip";
    tone = "bad";
  } else {
    badge = "Sucker Bet";
    tone = "bad";
  }

  // Biggest weakness: the most −EV leg, or the highest-hold leg if all are +EV.
  let biggestWeakness: string | null = null;
  if (legs > 0) {
    const worst = [...a.legs].sort((x, y) => x.evPercent - y.evPercent)[0];
    const highestHold = [...a.legs].sort((x, y) => y.hold - x.hold)[0];
    if (worst.evPercent < -0.01) {
      biggestWeakness = `"${worst.leg.selection}" is −EV on its own (${pct(
        worst.evPercent
      )} EV, ${pct(worst.hold)} hold) — it's dragging the whole ticket down.`;
    } else if (highestHold.hold > 0.06) {
      biggestWeakness = `"${highestHold.leg.selection}" carries a steep ${pct(
        highestHold.hold
      )} hold; the book's margin on that market is unusually high.`;
    }
  }

  // One-liner: book vs your estimate vs vig vs EV.
  const oneLiner =
    `Book implies ${pct(a.postedCombinedProb)} (${oneInX(a.postedCombinedProb)}); ` +
    `your fair estimate is ${pct(a.trueProb)} (${oneInX(a.trueProb)}). ` +
    `You're paying ${pct(a.parlayOverround)} in compounded vig across ${legs} ` +
    `leg${legs === 1 ? "" : "s"} — this is ${pct(ev)} EV. ` +
    (ev > 0.005
      ? "The math says there's an edge — size it carefully."
      : ev > -0.02
      ? "It's roughly a coinflip against the vig — no real edge."
      : "Don't place it.");

  // Suggestions.
  const suggestions: string[] = [];

  const droppable = [...a.legs]
    .filter((l) => l.evPercent < -0.01)
    .sort((x, y) => x.evPercent - y.evPercent);
  if (droppable.length > 0) {
    suggestions.push(
      `Drop "${droppable[0].leg.selection}" (${pct(
        droppable[0].evPercent
      )} EV) — trimming the weakest leg raises the ticket's EV.`
    );
  }

  const shoppable = [...a.legs]
    .filter((l) => l.shopImprovement > 1e-6)
    .sort((x, y) => y.shopImprovement - x.shopImprovement);
  if (shoppable.length > 0) {
    suggestions.push(
      `Shop "${shoppable[0].leg.selection}" — ${shoppable[0].bestBook} has a better price (${shoppable[0].bestDecimal.toFixed(
        2
      )} vs ${shoppable[0].postedDecimal.toFixed(2)}), which lifts the whole parlay's payout and EV.`
    );
  }

  if (legs >= 4) {
    suggestions.push(
      `Each added leg compounds the vig — at ${legs} legs you're paying ${pct(
        a.parlayOverround
      )} in juice. Fewer legs almost always means better EV.`
    );
  }

  if (a.correlation.mispriced && a.settings.sgpMode) {
    suggestions.push(
      `Correlation is in your favor here: the real (correlated) chance beats the independent price by ${pct(
        a.correlation.edge
      )}. This is where SGP value hides.`
    );
  }

  if (a.guardrail.exceedsThreshold) {
    suggestions.push(
      `Your stake is ${pct(a.guardrail.fractionOfBankroll)} of bankroll, above your ${pct(
        a.settings.maxStakeFraction
      )} guardrail. Consider ${"$" + a.guardrail.recommendedMaxStake.toFixed(2)} or less.`
    );
  }

  if (ev > 0.005 && a.kelly.full < 0.005) {
    suggestions.push(
      "The edge is real but razor-thin — Kelly says bet a tiny fraction. The variance may not be worth it."
    );
  }

  if (suggestions.length === 0) {
    suggestions.push("No obvious improvements — the ticket is what it is. Mind the variance and bankroll guardrail.");
  }

  return { badge, tone, oneLiner, biggestWeakness, suggestions };
}
