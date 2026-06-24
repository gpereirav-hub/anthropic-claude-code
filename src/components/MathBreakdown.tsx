// "Show your work" — the exact formulas and numbers behind the headline result.
import { useState } from "react";
import type { ParlayAnalysis } from "../lib/analyze";
import { Card } from "./ui";
import { pct, money } from "../format";

function Row({ formula, result }: { formula: string; result: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-800/60 py-1.5">
      <code className="text-[11px] text-slate-400">{formula}</code>
      <span className="tabular text-xs font-semibold text-slate-200">{result}</span>
    </div>
  );
}

export function MathBreakdown({ a }: { a: ParlayAnalysis }) {
  const [open, setOpen] = useState(false);
  const legDecs = a.legs.map((l) => l.postedDecimal.toFixed(2)).join(" × ");

  return (
    <Card
      title="Show the math"
      subtitle="Every number above, derived"
      right={
        <button onClick={() => setOpen((o) => !o)} className="text-xs text-sky-400 hover:text-sky-300">
          {open ? "Hide" : "Show"}
        </button>
      }
    >
      {!open ? (
        <p className="text-xs text-slate-500">
          The verdict isn't a black box. Expand to see the odds multiplication, vig removal, EV and
          Kelly formulas with this ticket's actual numbers.
        </p>
      ) : (
        <div className="space-y-4">
          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Combined odds & payout
            </h3>
            <Row formula={`combined_dec = ${legDecs || "—"}`} result={a.comboDecimal.toFixed(3)} />
            <Row formula={`payout = stake × combined_dec = ${a.stake} × ${a.comboDecimal.toFixed(2)}`} result={money(a.payout)} />
            <Row formula="profit = payout − stake" result={money(a.profit)} />
          </section>

          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Probabilities
            </h3>
            <Row formula="posted_combined = Π (1/dec_i)" result={`${pct(a.postedCombinedProb)} (${(1 / a.postedCombinedProb).toFixed(1)}-to-1)`} />
            <Row formula="fair_combined = Π fair_p_i  (no-vig, independent)" result={pct(a.fairIndependentProb)} />
            <Row formula="true_combined = correlation-adjusted Π true_p_i" result={pct(a.trueProb)} />
            <Row formula="break_even = 1 / combined_dec" result={pct(a.breakEvenProb)} />
          </section>

          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Vig (the house's cut)
            </h3>
            <Row formula="parlay_overround = posted_combined / fair_combined − 1" result={pct(a.parlayOverround)} />
            <Row formula="method" result={a.settings.vigMethod} />
            <p className="mt-1 text-[11px] text-slate-600">
              The overround compounds with each leg — that's why long parlays are so profitable for
              the book.
            </p>
          </section>

          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Expected value
            </h3>
            <Row formula="EV% = combined_dec × true_combined − 1" result={pct(a.evPercent)} />
            <Row formula="EV$ = stake × EV%" result={money(a.evDollars)} />
            <Row formula="house_edge = −EV%" result={pct(a.houseEdge)} />
            <Row formula="100-bet expectation = 100 × EV$" result={money(a.longRun100)} />
          </section>

          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Kelly & risk
            </h3>
            <Row formula="b = combined_dec − 1" result={(a.comboDecimal - 1).toFixed(3)} />
            <Row formula="f* = (b·p − q) / b   (full Kelly)" result={pct(a.kelly.full)} />
            <Row formula="¼ Kelly stake = bankroll × f*/4" result={money(a.recommendedStake)} />
            <Row formula="σ (per-bet profit)" result={money(a.risk.stdDev)} />
            <Row formula="risk of ruin (sim)" result={pct(a.riskOfRuin)} />
          </section>
        </div>
      )}
    </Card>
  );
}
