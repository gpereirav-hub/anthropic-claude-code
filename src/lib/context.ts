// Render the computed analysis into a compact, factual text block that grounds
// the chatbot. Everything the assistant should know about THIS parlay lives
// here, derived straight from the math engine (not the model's guesses).

import type { ParlayAnalysis } from "./analyze";
import { buildVerdict } from "./verdict";
import { formatOdds } from "./odds";
import type { OddsFormat } from "./types";

function pct(x: number, d = 1): string {
  return Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : "n/a";
}
function money(x: number): string {
  return Number.isFinite(x) ? `$${x.toFixed(2)}` : "n/a";
}

export function analysisContext(a: ParlayAnalysis, fmt: OddsFormat): string {
  const v = buildVerdict(a);
  const lines: string[] = [];

  lines.push(`Verdict: ${v.badge}`);
  lines.push(`One-line: ${v.oneLiner}`);
  if (v.biggestWeakness) lines.push(`Biggest weakness: ${v.biggestWeakness}`);
  lines.push("");
  lines.push(
    `Parlay: ${a.activeCount} active leg(s), combined odds ${formatOdds(
      a.comboDecimal,
      fmt
    )} (${a.comboDecimal.toFixed(2)} decimal). Stake ${money(a.stake)} to win ${money(a.profit)}.`
  );
  lines.push(
    `Book-implied hit chance ${pct(a.postedCombinedProb)}; no-vig fair (independent) ${pct(
      a.fairIndependentProb
    )}; your true (correlation-adjusted) ${pct(a.trueProb)}.`
  );
  lines.push(
    `Parlay EV ${pct(a.evPercent)} (${money(a.evDollars)} on this stake; ${money(
      a.longRun100
    )} over 100 bets). House edge ${pct(a.houseEdge)}. Compounded vig ${pct(a.parlayOverround)}.`
  );
  lines.push(
    `Monte Carlo (${a.monteCarlo.trials} trials): simulated hit ${pct(
      a.monteCarlo.hitRate
    )}, 95% CI ${pct(a.monteCarlo.ci95[0])}-${pct(a.monteCarlo.ci95[1])}.`
  );
  lines.push(
    `Risk: variance "${a.risk.swingLabel}" (σ ${money(a.risk.stdDev)}), risk of ruin ${pct(
      a.riskOfRuin
    )}. Kelly: full ${pct(a.kelly.full)}, quarter ${pct(
      a.kelly.quarter
    )} (~${money(a.recommendedStake)}). Stake is ${pct(
      a.guardrail.fractionOfBankroll
    )} of bankroll (guardrail ${pct(a.settings.maxStakeFraction)}).`
  );
  if (a.correlation.mispriced) {
    lines.push(
      `Correlation edge: real chance beats the independent price by ${pct(
        a.correlation.edge
      )} — possible SGP value.`
    );
  }

  lines.push("");
  lines.push("Legs:");
  a.legs.forEach((l, i) => {
    lines.push(
      `  ${i + 1}. ${l.leg.selection || "(unnamed)"} [${l.leg.league} ${l.leg.betType}] @ ${formatOdds(
        l.postedDecimal,
        fmt
      )} — posted ${pct(l.postedImplied)}, fair ${pct(l.fairProb)}, your ${pct(
        l.trueProb
      )}, EV ${pct(l.evPercent)}, hold ${pct(l.hold)}${
        l.shopImprovement > 1e-6 ? `, better price at ${l.bestBook}` : ""
      }${l.rlm ? ", reverse line movement" : ""}.`
    );
  });

  return lines.join("\n");
}
