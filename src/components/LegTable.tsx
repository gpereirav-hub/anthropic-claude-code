// Leg-by-leg breakdown table: selection, odds in all formats, posted %, fair %,
// EV%, hold and correlation/market flags — colour-coded.
import type { ParlayAnalysis } from "../lib/analyze";
import type { CorrelationPair } from "../lib/types";
import { decimalToAmerican, decimalToFractional } from "../lib/odds";
import { pct, signedPct, money } from "../format";
import { Card, Pill } from "./ui";

function allFormats(dec: number): string {
  const a = decimalToAmerican(dec);
  const f = decimalToFractional(dec);
  return `${a > 0 ? "+" + a : a} · ${dec.toFixed(2)} · ${f.num}/${f.den}`;
}

export function LegTable({
  a,
  pairs,
}: {
  a: ParlayAnalysis;
  pairs: CorrelationPair[];
}) {
  const correlatedIds = new Set<string>();
  for (const p of pairs) {
    if (p.rho !== 0) {
      correlatedIds.add(p.a);
      correlatedIds.add(p.b);
    }
  }

  return (
    <Card title="Leg-by-leg breakdown" subtitle="All odds formats shown · colours flag EV">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Selection</th>
              <th className="py-2 pr-3">Odds (A·D·F)</th>
              <th className="py-2 pr-3">Posted %</th>
              <th className="py-2 pr-3">Fair %</th>
              <th className="py-2 pr-3">Your %</th>
              <th className="py-2 pr-3">Hold</th>
              <th className="py-2 pr-3">EV%</th>
              <th className="py-2 pr-3">Flags</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {a.legs.map((l, i) => {
              const tone =
                l.evClass === "positive"
                  ? "text-emerald-300"
                  : l.evClass === "negative"
                  ? "text-rose-300"
                  : "text-amber-300";
              return (
                <tr key={l.leg.id} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-slate-200">{l.leg.selection || "—"}</div>
                    <div className="text-[10px] text-slate-500">
                      {l.leg.league} · {l.leg.betType.replace("_", " ")}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-slate-300">{allFormats(l.postedDecimal)}</td>
                  <td className="py-2 pr-3 text-slate-400">{pct(l.postedImplied)}</td>
                  <td className="py-2 pr-3 text-sky-300">{pct(l.fairProb)}</td>
                  <td className="py-2 pr-3 text-slate-200">
                    {pct(l.trueProb)}
                    {l.usedOverride && <span className="ml-1 text-[10px] text-sky-500">ovr</span>}
                  </td>
                  <td className="py-2 pr-3 text-amber-300/80">{pct(l.hold)}</td>
                  <td className={`py-2 pr-3 font-semibold ${tone}`}>
                    {signedPct(l.evPercent)}
                    <span className="ml-1 text-[10px] text-slate-500">{money(l.evDollars)}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {correlatedIds.has(l.leg.id) && <Pill tone="info">corr</Pill>}
                      {l.rlm && <Pill tone="info">RLM</Pill>}
                      {l.shopImprovement > 1e-6 && <Pill tone="warn">shop</Pill>}
                      {l.movement && l.movement.direction !== "unchanged" && (
                        <Pill tone="default">
                          {l.movement.direction === "shortened" ? "↓ short" : "↑ long"}
                        </Pill>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {a.voidedCount > 0 && (
              <tr>
                <td colSpan={9} className="py-2 text-[11px] text-slate-500">
                  {a.voidedCount} leg{a.voidedCount === 1 ? "" : "s"} voided/off — removed from the
                  parlay and recomputed (push/void handling).
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="tabular">
            <tr className="border-t border-slate-700 font-semibold text-slate-200">
              <td className="py-2 pr-3" />
              <td className="py-2 pr-3">Parlay ({a.activeCount} legs)</td>
              <td className="py-2 pr-3">{allFormats(a.comboDecimal)}</td>
              <td className="py-2 pr-3 text-slate-400">{pct(a.postedCombinedProb)}</td>
              <td className="py-2 pr-3 text-sky-300">{pct(a.fairIndependentProb)}</td>
              <td className="py-2 pr-3">{pct(a.trueProb)}</td>
              <td className="py-2 pr-3 text-amber-300">{pct(a.parlayOverround)}</td>
              <td
                className={`py-2 pr-3 ${
                  a.evPercent >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {signedPct(a.evPercent)}
              </td>
              <td className="py-2 pr-3" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        A·D·F = American · Decimal · Fractional. "Hold" is the book's margin on that market;
        the parlay row shows the <b>compounded</b> vig across all legs.
      </p>
    </Card>
  );
}
