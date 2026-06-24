// Poisson goal modeller (soccer & low-event totals). Enter expected goals (xG)
// for each side and read off totals + 1X2 probabilities — a power-rating style
// sanity check you can feed back into a leg's true-probability override.
import { useMemo, useState } from "react";
import { matchOutcomeProbs, totalOverProb, totalUnderProb } from "../lib/poisson";
import { Card, Field, NumberInput, Stat } from "./ui";
import { pct } from "../format";

export function PoissonHelper() {
  const [lh, setLh] = useState(1.6);
  const [la, setLa] = useState(1.1);
  const [line, setLine] = useState(2.5);

  const res = useMemo(() => {
    const o = matchOutcomeProbs(lh, la);
    return {
      o,
      over: totalOverProb(lh, la, line),
      under: totalUnderProb(lh, la, line),
    };
  }, [lh, la, line]);

  return (
    <Card title="Poisson goal model" subtitle="xG → totals & 1X2 (soccer, low-event markets)">
      <div className="grid grid-cols-3 gap-2">
        <Field label="Home xG (λ)">
          <NumberInput value={lh} step={0.1} min={0} onChange={(e) => setLh(Math.max(0, Number(e.target.value)))} />
        </Field>
        <Field label="Away xG (λ)">
          <NumberInput value={la} step={0.1} min={0} onChange={(e) => setLa(Math.max(0, Number(e.target.value)))} />
        </Field>
        <Field label="Total line">
          <NumberInput value={line} step={0.5} min={0.5} onChange={(e) => setLine(Math.max(0.5, Number(e.target.value)))} />
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Home win" value={pct(res.o.homeWin)} />
        <Stat label="Draw" value={pct(res.o.draw)} />
        <Stat label="Away win" value={pct(res.o.awayWin)} />
        <Stat label={`Over ${line}`} value={pct(res.over)} tone="good" />
        <Stat label={`Under ${line}`} value={pct(res.under)} tone="warn" />
        <Stat label="Total λ" value={(lh + la).toFixed(2)} sub="expected goals" />
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        Goals are modelled as two independent Poisson processes. Take any of these probabilities and
        drop it into a leg's "true %" override to price the bet against the book.
      </p>
    </Card>
  );
}
