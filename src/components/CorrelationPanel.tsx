// Correlation engine UI (SGP). For every pair of legs the user can set a
// correlation coefficient; the tool auto-suggests likely directions for common
// combos and flags when the book is mispricing correlation.
import type { CorrelationPair, Leg } from "../lib/types";
import type { ParlayAnalysis } from "../lib/analyze";
import { suggestCorrelation } from "../lib/correlation";
import { Button, Card, Pill } from "./ui";
import { pct } from "../format";

function keyFor(a: string, b: string) {
  return [a, b].sort().join("|");
}

export function CorrelationPanel({
  legs,
  pairs,
  analysis,
  onChange,
}: {
  legs: Leg[];
  pairs: CorrelationPair[];
  analysis: ParlayAnalysis;
  onChange: (pairs: CorrelationPair[]) => void;
}) {
  const active = legs.filter((l) => !l.voided);
  const pairMap = new Map(pairs.map((p) => [keyFor(p.a, p.b), p]));

  const setRho = (a: string, b: string, rho: number, suggested = false, note?: string) => {
    const k = keyFor(a, b);
    const next = pairs.filter((p) => keyFor(p.a, p.b) !== k);
    if (rho !== 0) next.push({ a, b, rho, suggested, note });
    onChange(next);
  };

  const combos: [Leg, Leg][] = [];
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) combos.push([active[i], active[j]]);

  const applyAllSuggestions = () => {
    const next = [...pairs];
    for (const [a, b] of combos) {
      const k = keyFor(a.id, b.id);
      if (pairMap.has(k)) continue;
      const s = suggestCorrelation(a, b);
      if (s) next.push({ a: a.id, b: b.id, rho: s.rho, suggested: true, note: s.note });
    }
    onChange(next);
  };

  return (
    <Card
      title="Correlation engine"
      subtitle="Legs are rarely independent — set how each pair moves together"
      right={
        combos.length > 0 ? (
          <Button onClick={applyAllSuggestions}>Auto-suggest all</Button>
        ) : undefined
      }
    >
      {analysis.correlation.mispriced ? (
        <div className="mb-3 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <b>Correlation in your favor:</b> the real (correlated) parlay chance is{" "}
          {pct(analysis.correlation.edge)} higher than an independent price would imply. If the book
          priced these legs as independent, that gap is genuine +EV.
        </div>
      ) : (
        <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-500">
          True (correlated) chance {pct(analysis.trueProb)} vs independent product{" "}
          {pct(analysis.trueIndependentProb)}. Positive correlation pushes the true chance up;
          negative pulls it down.
        </div>
      )}

      {combos.length === 0 ? (
        <p className="text-xs text-slate-500">Add at least two active legs to set correlations.</p>
      ) : (
        <div className="space-y-2">
          {combos.map(([a, b]) => {
            const k = keyFor(a.id, b.id);
            const existing = pairMap.get(k);
            const rho = existing?.rho ?? 0;
            const sug = suggestCorrelation(a, b);
            return (
              <div key={k} className="rounded-lg bg-slate-800/30 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-300">
                    <span className="font-medium text-slate-200">{a.selection || "Leg"}</span>
                    <span className="mx-1 text-slate-600">↔</span>
                    <span className="font-medium text-slate-200">{b.selection || "Leg"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {existing?.suggested && <Pill tone="info">suggested</Pill>}
                    <span
                      className={`tabular w-14 text-right text-sm font-semibold ${
                        rho > 0 ? "text-emerald-300" : rho < 0 ? "text-rose-300" : "text-slate-400"
                      }`}
                    >
                      ρ {rho >= 0 ? "+" : ""}
                      {rho.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="range"
                    min={-95}
                    max={95}
                    value={Math.round(rho * 100)}
                    onChange={(e) => setRho(a.id, b.id, Number(e.target.value) / 100)}
                    className="w-full accent-sky-500"
                  />
                  {rho !== 0 && (
                    <button
                      className="text-[11px] text-slate-500 hover:text-rose-400"
                      onClick={() => setRho(a.id, b.id, 0)}
                    >
                      reset
                    </button>
                  )}
                </div>
                {sug && (
                  <button
                    className="mt-1 text-left text-[11px] text-sky-400/80 hover:text-sky-300"
                    onClick={() => setRho(a.id, b.id, sug.rho, true, sug.note)}
                  >
                    Suggest ρ {sug.rho >= 0 ? "+" : ""}
                    {sug.rho.toFixed(2)} — {sug.note}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-600">
        Suggestions are documented estimates, not measured values. The Monte Carlo uses a
        Gaussian copula so these correlations flow through to the simulated hit rate.
      </p>
    </Card>
  );
}
