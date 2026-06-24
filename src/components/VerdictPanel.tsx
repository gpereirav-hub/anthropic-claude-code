// The honest readout that sits at the top: verdict badge, the true house edge,
// the blunt one-liner, the single biggest weakness, and how to improve.
import type { ParlayAnalysis } from "../lib/analyze";
import { buildVerdict } from "../lib/verdict";
import { pct, signedPct, oneInX, signedMoney } from "../format";
import { Pill } from "./ui";

export function VerdictPanel({ a }: { a: ParlayAnalysis }) {
  const v = buildVerdict(a);

  const badgeTone =
    v.tone === "good"
      ? "border-emerald-500/50 bg-emerald-500/10"
      : v.tone === "warn"
      ? "border-amber-500/50 bg-amber-500/10"
      : "border-rose-500/50 bg-rose-500/10";
  const badgeText =
    v.tone === "good" ? "text-emerald-300" : v.tone === "warn" ? "text-amber-300" : "text-rose-300";

  return (
    <section className={`rounded-2xl border ${badgeTone} p-5 shadow-xl shadow-black/30`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-extrabold tracking-tight ${badgeText}`}>{v.badge}</span>
          <Pill tone={a.evPercent >= 0 ? "good" : "bad"}>
            {signedPct(a.evPercent)} EV
          </Pill>
          <Pill tone="warn" title="The book's true mathematical edge on this exact parlay.">
            House edge {pct(a.houseEdge)}
          </Pill>
        </div>
        <div className="flex flex-wrap gap-2 text-right">
          <Pill tone="info">Book: {pct(a.postedCombinedProb)} · {oneInX(a.postedCombinedProb)}</Pill>
          <Pill tone="default">Your fair: {pct(a.trueProb)} · {oneInX(a.trueProb)}</Pill>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-200">{v.oneLiner}</p>

      {v.biggestWeakness && (
        <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
          <span className="font-semibold text-rose-300">Biggest weakness: </span>
          {v.biggestWeakness}
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {v.suggestions.map((s, i) => (
          <div
            key={i}
            className="flex gap-2 rounded-lg bg-slate-950/30 px-3 py-2 text-xs text-slate-300"
          >
            <span className="text-sky-400">→</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
        <span>
          Stake <b className="text-slate-200">${a.stake.toFixed(2)}</b>
        </span>
        <span>
          To win <b className="text-emerald-300">{signedMoney(a.profit)}</b>
        </span>
        <span>
          EV in $ <b className={a.evDollars >= 0 ? "text-emerald-300" : "text-rose-300"}>{signedMoney(a.evDollars)}</b>
        </span>
        <span>
          Over 100 bets <b className={a.longRun100 >= 0 ? "text-emerald-300" : "text-rose-300"}>{signedMoney(a.longRun100)}</b>
        </span>
        <span>
          Compounded vig <b className="text-amber-300">{pct(a.parlayOverround)}</b>
        </span>
      </div>
    </section>
  );
}
