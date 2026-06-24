import { useMemo, useState } from "react";
import type { CorrelationPair, Leg, ParlaySettings } from "./lib/types";
import { analyzeParlay } from "./lib/analyze";
import { defaultSettings, newLeg, sampleLegs, uid } from "./state";
import { SettingsBar } from "./components/SettingsBar";
import { LegCard } from "./components/LegCard";
import { VerdictPanel } from "./components/VerdictPanel";
import { LegTable } from "./components/LegTable";
import { ProbabilityBars, EvWaterfall, MonteCarloChart } from "./components/Charts";
import { BankrollPanel } from "./components/BankrollPanel";
import { CorrelationPanel } from "./components/CorrelationPanel";
import { BacktestPanel } from "./components/BacktestPanel";
import { PoissonHelper } from "./components/PoissonHelper";
import { MathBreakdown } from "./components/MathBreakdown";
import { Button, Card, Pill } from "./components/ui";
import { signedPct } from "./format";

export default function App() {
  const [settings, setSettings] = useState<ParlaySettings>(defaultSettings);
  const [legs, setLegs] = useState<Leg[]>(sampleLegs);
  const [pairs, setPairs] = useState<CorrelationPair[]>([]);

  const active = legs.filter((l) => !l.voided);

  const analysis = useMemo(
    () => analyzeParlay(legs, pairs, settings),
    [legs, pairs, settings]
  );

  // What-if: how does the parlay EV change if each leg is dropped?
  const whatIf = useMemo(() => {
    if (active.length <= 1) return [];
    return active.map((dropped) => {
      const remaining = active.filter((l) => l.id !== dropped.id);
      const a = analyzeParlay(remaining, pairs, settings);
      return { id: dropped.id, selection: dropped.selection, ev: a.evPercent, delta: a.evPercent - analysis.evPercent };
    });
  }, [active, pairs, settings, analysis.evPercent]);

  const updateLeg = (id: string, l: Leg) =>
    setLegs((prev) => prev.map((p) => (p.id === id ? l : p)));
  const removeLeg = (id: string) => {
    setLegs((prev) => prev.filter((p) => p.id !== id));
    setPairs((prev) => prev.filter((p) => p.a !== id && p.b !== id));
  };
  const addLeg = () => setLegs((prev) => [...prev, newLeg({ id: uid("leg") })]);

  const hasParlay = analysis.activeCount >= 1;

  return (
    <div className="min-h-full bg-slate-950">
      <Header />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <SettingsBar settings={settings} onChange={setSettings} />

        {hasParlay ? (
          <VerdictPanel a={analysis} />
        ) : (
          <Card>
            <p className="text-sm text-slate-400">
              Add at least one active leg to see the analysis. A single-leg "parlay" is analyzed too.
            </p>
          </Card>
        )}

        {/* Legs editor */}
        <Card
          title="Legs"
          subtitle={`${analysis.activeCount} active${
            analysis.voidedCount ? ` · ${analysis.voidedCount} void/off` : ""
          }`}
          right={
            <div className="flex gap-2">
              <Button onClick={() => setLegs(sampleLegs())} variant="ghost">
                Reset sample
              </Button>
              <Button onClick={() => setLegs([])} variant="ghost">
                Clear
              </Button>
              <Button onClick={addLeg} variant="primary">
                + Add leg
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {legs.length === 0 && (
              <p className="text-xs text-slate-500">No legs yet — add one to begin.</p>
            )}
            {legs.map((leg, i) => {
              const la = analysis.legs.find((x) => x.leg.id === leg.id);
              return (
                <LegCard
                  key={leg.id}
                  leg={leg}
                  index={i}
                  analysis={la}
                  format={settings.displayFormat}
                  sgpMode={settings.sgpMode}
                  onChange={(l) => updateLeg(leg.id, l)}
                  onRemove={() => removeLeg(leg.id)}
                />
              );
            })}
          </div>
        </Card>

        {hasParlay && (
          <>
            <LegTable a={analysis} pairs={pairs} />

            <div className="grid gap-5 lg:grid-cols-2">
              <ProbabilityBars a={analysis} />
              <EvWaterfall a={analysis} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <MonteCarloChart a={analysis} />
              <BankrollPanel a={analysis} />
            </div>

            {/* What-if: drop a leg */}
            {whatIf.length > 0 && (
              <Card title="What-if: drop a leg" subtitle="Live recompute of parlay EV with each leg removed">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {whatIf.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2 text-xs"
                    >
                      <span className="truncate text-slate-300">
                        without "{w.selection || "leg"}"
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`tabular font-semibold ${w.ev >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {signedPct(w.ev)}
                        </span>
                        <Pill tone={w.delta > 0 ? "good" : w.delta < 0 ? "bad" : "default"}>
                          {w.delta >= 0 ? "+" : ""}
                          {(w.delta * 100).toFixed(1)}pt
                        </Pill>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-600">
                  A green chip means cutting that leg <i>improves</i> the ticket — it was dragging EV
                  down. Use the void toggle on a leg to apply it.
                </p>
              </Card>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <CorrelationPanel
                legs={legs}
                pairs={pairs}
                analysis={analysis}
                onChange={setPairs}
              />
              <MathBreakdown a={analysis} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <PoissonHelper />
              <BacktestPanel />
            </div>
          </>
        )}

        <ResponsibleFooter />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <rect width="32" height="32" rx="6" fill="#0f172a" />
            <path
              d="M6 20l5-8 5 5 4-9 6 12"
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100">Parlay Analyzer</h1>
            <p className="text-xs text-slate-500">
              True probability · vig stripped · EV · correlation · Monte Carlo — the honest numbers.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="info">100% client-side</Pill>
          <Pill tone="default">no data leaves your browser</Pill>
        </div>
      </div>
    </header>
  );
}

function ResponsibleFooter() {
  return (
    <footer className="mt-8 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-[11px] leading-relaxed text-slate-500">
      <p>
        <b className="text-slate-400">The honest part:</b> the longer a parlay gets, the worse its
        expected value typically becomes — every leg compounds the book's vig. This tool exists to
        make that house edge undeniable, not to help you beat it.
      </p>
      <p>
        Estimates are only as good as your inputs. Removing vig and modelling correlation gets you to
        a <i>fair</i> number, but no model beats an efficient market consistently without a real,
        durable edge. The break-even and risk-of-ruin readouts are there for a reason.
      </p>
      <p>
        Bet only what you can afford to lose, respect the bankroll guardrail, and treat a "Sucker
        Bet" verdict as exactly that. If gambling stops being fun, call 1-800-GAMBLER.
      </p>
      <p className="text-slate-600">
        Live odds, injury and weather feeds are stubbed as labelled hooks throughout — wire a real
        provider into <code>marketSiblingsDecimal</code>, the context factors, and book quotes to go
        from manual entry to automated.
      </p>
    </footer>
  );
}
