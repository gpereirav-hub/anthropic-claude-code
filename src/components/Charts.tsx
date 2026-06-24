// Visualizations: probability comparison, EV waterfall, and the Monte Carlo
// outcome distribution. Built on Recharts.
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ParlayAnalysis } from "../lib/analyze";
import { Card } from "./ui";
import { pct, signedPct, money } from "../format";

const GREEN = "#34d399";
const RED = "#fb7185";
const SLATE = "#64748b";
const SKY = "#38bdf8";
const AMBER = "#fbbf24";

/** Book-implied vs your-estimated parlay hit chance. */
export function ProbabilityBars({ a }: { a: ParlayAnalysis }) {
  const data = [
    { name: "Book implied", value: a.postedCombinedProb * 100, fill: SLATE },
    { name: "No-vig fair", value: a.fairIndependentProb * 100, fill: SKY },
    { name: "Your true (corr.)", value: a.trueProb * 100, fill: a.evPercent >= 0 ? GREEN : RED },
    { name: "Break-even needed", value: a.breakEvenProb * 100, fill: AMBER },
  ];
  return (
    <Card
      title="Hit chance: book vs. you"
      subtitle="The gap between what the book sells and what the math says"
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 40 }}>
          <XAxis type="number" domain={[0, "dataMax"]} tick={{ fill: SLATE, fontSize: 11 }} unit="%" />
          <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [`${v.toFixed(1)}%`, "chance"]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => `${v.toFixed(1)}%`}
              fill="#94a3b8"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-slate-600">
        If your true estimate sits below the break-even line, the bet is −EV.
      </p>
    </Card>
  );
}

/** EV waterfall: each leg's standalone EV%, then the combined parlay EV%. */
export function EvWaterfall({ a }: { a: ParlayAnalysis }) {
  const data = [
    ...a.legs.map((l, i) => ({
      name: `L${i + 1}`,
      value: l.evPercent * 100,
      label: l.leg.selection || `Leg ${i + 1}`,
    })),
    { name: "Parlay", value: a.evPercent * 100, label: "Parlay EV" },
  ];
  return (
    <Card title="EV waterfall" subtitle="Where value is created or destroyed, leg by leg">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fill: SLATE, fontSize: 11 }} />
          <YAxis tick={{ fill: SLATE, fontSize: 11 }} unit="%" />
          <ReferenceLine y={0} stroke="#475569" />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number, _n, p) => [`${signedPct(v / 100)}`, (p.payload as { label: string }).label]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value >= 0 ? GREEN : RED} opacity={i === data.length - 1 ? 1 : 0.7} />
            ))}
            <LabelList dataKey="value" position="top" formatter={(v: number) => `${v.toFixed(0)}%`} fill="#94a3b8" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-slate-600">
        Each bar is that leg's EV if bet alone. A single deep-red leg can sink an otherwise fine ticket.
      </p>
    </Card>
  );
}

/** Monte Carlo outcome distribution (all-or-nothing) + simulated vs book. */
export function MonteCarloChart({ a }: { a: ParlayAnalysis }) {
  const mc = a.monteCarlo;
  const data = mc.histogram.map((h) => ({
    name: h.label,
    count: h.count,
    pctTrials: (h.count / mc.trials) * 100,
    win: h.value >= 0,
  }));
  return (
    <Card
      title="Monte Carlo simulation"
      subtitle={`${mc.trials.toLocaleString()} trials · Gaussian-copula (correlations honoured)`}
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 16 }}>
          <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
          <YAxis tick={{ fill: SLATE, fontSize: 11 }} unit="%" />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [`${v.toFixed(1)}% of trials`, "frequency"]}
          />
          <Bar dataKey="pctTrials" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.win ? GREEN : RED} />
            ))}
            <LabelList dataKey="pctTrials" position="top" formatter={(v: number) => `${v.toFixed(1)}%`} fill="#94a3b8" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Mini label="Simulated hit" value={pct(mc.hitRate)} />
        <Mini label="95% CI" value={`${pct(mc.ci95[0])}–${pct(mc.ci95[1])}`} />
        <Mini label="Book implied" value={pct(a.postedCombinedProb)} />
        <Mini label="Mean / trial" value={money(mc.meanProfit)} tone={mc.meanProfit >= 0 ? "good" : "bad"} />
      </div>
    </Card>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const c = tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-rose-300" : "text-slate-200";
  return (
    <div className="rounded bg-slate-800/40 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`tabular font-semibold ${c}`}>{value}</div>
    </div>
  );
}
