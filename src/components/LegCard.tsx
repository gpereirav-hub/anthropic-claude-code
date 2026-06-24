// Editor + live analysis for a single leg: odds (any format), the opposing
// market price (for vig removal), an optional true-probability override, a
// per-sport context panel that nudges the estimate, line-shop prices, and
// line-movement / public-betting inputs.
import { useState } from "react";
import type { BetType, League, Leg } from "../lib/types";
import type { LegAnalysis } from "../lib/analyze";
import { formatOdds, parseOdds } from "../lib/odds";
import { contextFactors, LEAGUES, BET_TYPES } from "../lib/sports";
import { pct, signedPct, money } from "../format";
import { uid } from "../state";
import {
  Button,
  Field,
  NumberInput,
  Pill,
  Select,
  TextInput,
  Toggle,
} from "./ui";
import type { OddsFormat } from "../lib/types";

/** Odds text buffer that parses to decimal in the active display format. */
function OddsInput({
  decimal,
  format,
  onChange,
  placeholder,
}: {
  decimal: number | undefined;
  format: OddsFormat;
  onChange: (dec: number) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(
    decimal !== undefined ? formatOdds(decimal, format) : ""
  );
  const [err, setErr] = useState(false);

  // Re-sync when the display format changes.
  const display = decimal !== undefined ? formatOdds(decimal, format) : "";
  const [lastFmt, setLastFmt] = useState(format);
  if (lastFmt !== format) {
    setLastFmt(format);
    setText(display);
    setErr(false);
  }

  return (
    <div>
      <TextInput
        value={text}
        placeholder={placeholder ?? (format === "american" ? "-110" : format === "decimal" ? "1.91" : "10/11")}
        className={err ? "border-rose-600" : ""}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (v.trim() === "") {
            setErr(true);
            return;
          }
          try {
            const dec = parseOdds(v, format);
            setErr(false);
            onChange(dec);
          } catch {
            setErr(true);
          }
        }}
      />
    </div>
  );
}

export function LegCard({
  leg,
  index,
  analysis,
  format,
  sgpMode,
  onChange,
  onRemove,
}: {
  leg: Leg;
  index: number;
  analysis?: LegAnalysis;
  format: OddsFormat;
  sgpMode: boolean;
  onChange: (l: Leg) => void;
  onRemove: () => void;
}) {
  const [showContext, setShowContext] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const set = <K extends keyof Leg>(k: K, v: Leg[K]) => onChange({ ...leg, [k]: v });

  const factors = contextFactors(leg.league, leg.betType);
  const overrideOn = leg.trueProbOverride !== undefined;

  const evTone =
    analysis === undefined
      ? "default"
      : analysis.evClass === "positive"
      ? "good"
      : analysis.evClass === "negative"
      ? "bad"
      : "warn";

  return (
    <div
      className={`rounded-xl border bg-slate-900/50 p-4 ${
        leg.voided ? "border-slate-800 opacity-50" : "border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-700 text-xs font-bold text-slate-200">
            {index + 1}
          </span>
          {analysis && !leg.voided && (
            <Pill tone={evTone as "good" | "bad" | "warn"}>
              {signedPct(analysis.evPercent)} EV
            </Pill>
          )}
          {analysis?.rlm && (
            <Pill tone="info" title="Reverse line movement: line moved against heavy public money — sharp signal.">
              RLM
            </Pill>
          )}
          {analysis && analysis.shopImprovement > 1e-6 && (
            <Pill tone="warn" title="A shopped book has a better price than your book.">
              shop {analysis.bestBook}
            </Pill>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            checked={leg.voided}
            onChange={(v) => set("voided", v)}
            label={<span className="text-[11px] text-slate-500">void/off</span>}
          />
          <Button variant="ghost" onClick={onRemove} title="Remove leg">
            ✕
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <Field label="League">
            <Select value={leg.league} onChange={(e) => set("league", e.target.value as League)}>
              {LEAGUES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="md:col-span-3">
          <Field label="Bet type">
            <Select value={leg.betType} onChange={(e) => set("betType", e.target.value as BetType)}>
              {BET_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="md:col-span-4">
          <Field label="Selection">
            <TextInput
              value={leg.selection}
              placeholder="e.g. Chiefs ML"
              onChange={(e) => set("selection", e.target.value)}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={`Odds (${format})`}>
            <OddsInput
              decimal={leg.decimalOdds}
              format={format}
              onChange={(dec) => set("decimalOdds", dec)}
            />
          </Field>
        </div>
      </div>

      {/* Computed read for this leg */}
      {analysis && !leg.voided && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-950/40 p-2 text-xs sm:grid-cols-5">
          <Read label="Posted" value={formatOdds(analysis.postedDecimal, format)} sub={pct(analysis.postedImplied)} />
          <Read label="Fair (no-vig)" value={formatOdds(analysis.fairDecimal, format)} sub={pct(analysis.fairProb)} />
          <Read label="Your true %" value={pct(analysis.trueProb)} sub={analysis.usedOverride ? "override" : "from market"} />
          <Read label="Leg hold" value={pct(analysis.hold)} sub="book margin" />
          <Read
            label="EV (if solo)"
            value={signedPct(analysis.evPercent)}
            sub={money(analysis.evDollars)}
            tone={evTone}
          />
        </div>
      )}

      {/* True-probability override */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Toggle
          checked={overrideOn}
          onChange={(v) =>
            set("trueProbOverride", v ? analysis?.fairProb ?? 0.5 : (undefined as never))
          }
          label="Override true %"
        />
        {overrideOn && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={99}
              value={Math.round((leg.trueProbOverride ?? 0.5) * 100)}
              onChange={(e) => set("trueProbOverride", Number(e.target.value) / 100)}
              className="w-40 accent-sky-500"
            />
            <span className="tabular w-12 text-sm text-sky-300">
              {pct(leg.trueProbOverride ?? 0.5, 0)}
            </span>
          </div>
        )}
        <button
          onClick={() => setShowContext((s) => !s)}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          {showContext ? "▾" : "▸"} Context factors
          {leg.nudges.length > 0 && (
            <span className="ml-1 text-sky-400">({leg.nudges.length})</span>
          )}
        </button>
        <button
          onClick={() => setShowMarket((s) => !s)}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          {showMarket ? "▾" : "▸"} Market / line shopping
        </button>
      </div>

      {showContext && (
        <ContextEditor leg={leg} factors={factors} onChange={onChange} />
      )}

      {showMarket && <MarketEditor leg={leg} format={format} onChange={onChange} />}

      {sgpMode && (
        <p className="mt-2 text-[11px] text-slate-600">
          SGP mode: set how this leg correlates with others in the Correlation panel below.
        </p>
      )}
    </div>
  );
}

function Read({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
      ? "text-rose-300"
      : tone === "warn"
      ? "text-amber-300"
      : "text-slate-200";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`tabular text-sm font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function ContextEditor({
  leg,
  factors,
  onChange,
}: {
  leg: Leg;
  factors: ReturnType<typeof contextFactors>;
  onChange: (l: Leg) => void;
}) {
  const [factorKey, setFactorKey] = useState(factors[0]?.key ?? "");
  const [delta, setDelta] = useState(2);
  const [reason, setReason] = useState("");

  const factor = factors.find((f) => f.key === factorKey);

  const add = () => {
    if (!factor) return;
    onChange({
      ...leg,
      nudges: [
        ...leg.nudges,
        {
          id: uid("nudge"),
          label: factor.label,
          delta: delta / 100,
          reason: reason || factor.hint,
        },
      ],
    });
    setReason("");
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <p className="mb-2 text-[11px] text-slate-500">
        Nudge your true-probability estimate with situational data. These adjust the leg's
        probability by the points you set — no live data is fabricated; each factor notes where a
        feed would plug in.
      </p>
      <div className="grid gap-2 md:grid-cols-12">
        <div className="md:col-span-4">
          <Field label="Factor">
            <Select value={factorKey} onChange={(e) => setFactorKey(e.target.value)}>
              {factors.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Nudge (pts)">
            <NumberInput
              value={delta}
              step={1}
              min={-25}
              max={25}
              onChange={(e) => setDelta(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="md:col-span-5">
          <Field label="Reason">
            <TextInput
              value={reason}
              placeholder={factor?.hint}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex items-end md:col-span-1">
          <Button variant="primary" onClick={add}>
            Add
          </Button>
        </div>
      </div>
      {factor && (
        <p className="mt-1 text-[10px] text-slate-600">
          Live feed: {factor.feed}
        </p>
      )}

      {leg.nudges.length > 0 && (
        <ul className="mt-2 space-y-1">
          {leg.nudges.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between gap-2 rounded bg-slate-900/60 px-2 py-1 text-xs"
            >
              <span>
                <span className={n.delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {n.delta >= 0 ? "+" : ""}
                  {(n.delta * 100).toFixed(0)} pts
                </span>{" "}
                <span className="text-slate-300">{n.label}</span>
                <span className="text-slate-500"> — {n.reason}</span>
              </span>
              <button
                className="text-slate-500 hover:text-rose-400"
                onClick={() =>
                  onChange({ ...leg, nudges: leg.nudges.filter((x) => x.id !== n.id) })
                }
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MarketEditor({
  leg,
  format,
  onChange,
}: {
  leg: Leg;
  format: OddsFormat;
  onChange: (l: Leg) => void;
}) {
  const set = <K extends keyof Leg>(k: K, v: Leg[K]) => onChange({ ...leg, [k]: v });
  const [bookName, setBookName] = useState("");

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Field
            label="Opposing side odds (for vig removal)"
            hint="The other side(s) of this market — lets the tool measure the book's overround. Comma-separate multi-way markets."
          >
            <TextInput
              value={leg.marketSiblingsDecimal.map((d) => formatOdds(d, format)).join(", ")}
              placeholder={format === "american" ? "-110, +250" : "1.91"}
              onChange={(e) => {
                const parts = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                const decimals: number[] = [];
                for (const p of parts) {
                  try {
                    decimals.push(parseOdds(p, format));
                  } catch {
                    /* ignore partial entries */
                  }
                }
                set("marketSiblingsDecimal", decimals);
              }}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Opening odds" hint="For line-movement detection">
            <OddsInputLite
              decimal={leg.openingDecimalOdds}
              format={format}
              onChange={(d) => set("openingDecimalOdds", d)}
            />
          </Field>
          <Field label="Public bet %" hint="For RLM detection">
            <NumberInput
              value={leg.publicBetPct ?? ""}
              min={0}
              max={100}
              placeholder="—"
              onChange={(e) =>
                set("publicBetPct", e.target.value === "" ? (undefined as never) : Number(e.target.value))
              }
            />
          </Field>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-medium text-slate-400">Line shopping — same leg at other books</div>
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <Field label="Book name">
            <TextInput
              value={bookName}
              placeholder="DK / FD / MGM"
              onChange={(e) => setBookName(e.target.value)}
              className="w-28"
            />
          </Field>
          <Field label="Their price">
            <OddsInputLite
              decimal={undefined}
              format={format}
              onChange={(d) => {
                if (!bookName) return;
                set("bookQuotes", [...leg.bookQuotes, { book: bookName, decimal: d }]);
                setBookName("");
              }}
              commitOnEnter
            />
          </Field>
          <span className="pb-2 text-[10px] text-slate-600">enter price + press ↵</span>
        </div>
        {leg.bookQuotes.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {leg.bookQuotes.map((q, i) => (
              <li
                key={i}
                className="flex items-center gap-1 rounded bg-slate-900/60 px-2 py-1 text-xs text-slate-300"
              >
                {q.book}: {formatOdds(q.decimal, format)}
                <button
                  className="text-slate-500 hover:text-rose-400"
                  onClick={() =>
                    set("bookQuotes", leg.bookQuotes.filter((_, j) => j !== i))
                  }
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** A compact odds input used for secondary fields. */
function OddsInputLite({
  decimal,
  format,
  onChange,
  commitOnEnter,
}: {
  decimal: number | undefined;
  format: OddsFormat;
  onChange: (dec: number) => void;
  commitOnEnter?: boolean;
}) {
  const [text, setText] = useState(decimal !== undefined ? formatOdds(decimal, format) : "");
  const [err, setErr] = useState(false);
  const commit = () => {
    try {
      const dec = parseOdds(text, format);
      setErr(false);
      onChange(dec);
      if (commitOnEnter) setText("");
    } catch {
      setErr(true);
    }
  };
  return (
    <TextInput
      value={text}
      className={`w-24 ${err ? "border-rose-600" : ""}`}
      placeholder={format === "american" ? "-110" : "1.91"}
      onChange={(e) => {
        setText(e.target.value);
        if (!commitOnEnter) {
          try {
            onChange(parseOdds(e.target.value, format));
            setErr(false);
          } catch {
            setErr(e.target.value.trim() !== "");
          }
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      onBlur={() => commitOnEnter || commit()}
    />
  );
}
