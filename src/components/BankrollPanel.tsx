// Bankroll & risk management: Kelly sizing, bankroll guardrail, risk of ruin,
// and the parlay's variance translated into plain language.
import type { ParlayAnalysis } from "../lib/analyze";
import { Card, Pill, Stat } from "./ui";
import { pct, money, signedMoney } from "../format";

export function BankrollPanel({ a }: { a: ParlayAnalysis }) {
  const k = a.kelly;
  const positiveEdge = a.evPercent > 0 && k.full > 0;
  const overGuardrail = a.guardrail.exceedsThreshold;

  return (
    <Card title="Bankroll & risk" subtitle="Size it sanely — or don't size it at all">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          label="Stake / bankroll"
          value={pct(a.guardrail.fractionOfBankroll)}
          sub={`guardrail ${pct(a.settings.maxStakeFraction)}`}
          tone={overGuardrail ? "bad" : "good"}
        />
        <Stat
          label="Variance swing"
          value={a.risk.swingLabel}
          sub={`σ ${money(a.risk.stdDev)} (${a.risk.volatilityRatio.toFixed(1)}× stake)`}
          tone={a.risk.swingLabel === "Low" ? "good" : a.risk.swingLabel === "Extreme" ? "bad" : "warn"}
        />
        <Stat
          label="Risk of ruin"
          value={pct(a.riskOfRuin)}
          sub="repeating this bet at 1 unit"
          tone={a.riskOfRuin > 0.2 ? "bad" : a.riskOfRuin > 0.05 ? "warn" : "good"}
        />
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Kelly Criterion stake</span>
          <Pill tone={positiveEdge ? "good" : "bad"}>
            {positiveEdge ? "edge present" : "no edge → no bet"}
          </Pill>
        </div>
        {positiveEdge ? (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <KellyCell label="Full" frac={k.full} bankroll={a.settings.bankroll} />
            <KellyCell label="Half" frac={k.half} bankroll={a.settings.bankroll} />
            <KellyCell label="Quarter ✓" frac={k.quarter} bankroll={a.settings.bankroll} recommended />
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Kelly returns 0% — at a negative edge the mathematically optimal stake is nothing. Any
            money put down here is expected to shrink your bankroll.
          </p>
        )}
        {positiveEdge && k.full < 0.005 && (
          <p className="mt-2 text-[11px] text-amber-300/80">
            The edge is razor-thin: Kelly says &lt;0.5% of bankroll. The variance may not be worth it.
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat
          label="Recommended stake (¼ Kelly)"
          value={positiveEdge ? money(a.recommendedStake) : money(0)}
          sub="given your bankroll"
          tone={positiveEdge ? "good" : "default"}
        />
        <Stat
          label="Expected P/L on this stake"
          value={signedMoney(a.evDollars)}
          sub="per placement, long run"
          tone={a.evDollars >= 0 ? "good" : "bad"}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Plain language: a "{a.risk.swingLabel}" swing means a typical outcome lands roughly{" "}
        {money(a.risk.stdDev)} either side of the average — and a parlay is all-or-nothing, so most
        nights you lose the stake and occasionally you hit the {money(a.profit)} payout.
      </p>
    </Card>
  );
}

function KellyCell({
  label,
  frac,
  bankroll,
  recommended,
}: {
  label: string;
  frac: number;
  bankroll: number;
  recommended?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-2 py-2 ${
        recommended ? "bg-emerald-500/10 ring-1 ring-emerald-600/40" : "bg-slate-800/40"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="tabular text-base font-semibold text-slate-100">{pct(frac)}</div>
      <div className="text-[10px] text-slate-500">{money(bankroll * frac)}</div>
    </div>
  );
}
