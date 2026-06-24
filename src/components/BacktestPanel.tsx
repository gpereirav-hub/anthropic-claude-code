// Backtest a betting strategy by pasting historical results as CSV.
import { useMemo, useState } from "react";
import { parseBacktestCsv } from "../lib/backtest";
import { Button, Card, Stat } from "./ui";
import { pct, money, signedMoney } from "../format";

const SAMPLE = `date,stake,odds,result
2024-09-08,50,6.4,loss
2024-09-15,50,5.2,win
2024-09-22,50,11.0,loss
2024-09-29,50,4.1,win
2024-10-06,50,7.5,loss
2024-10-13,50,3.8,loss`;

export function BacktestPanel() {
  const [csv, setCsv] = useState("");
  const summary = useMemo(() => (csv.trim() ? parseBacktestCsv(csv) : null), [csv]);

  return (
    <Card
      title="Backtest a strategy"
      subtitle="Paste past results (CSV) → ROI, hit rate, variance"
      right={
        <Button variant="ghost" onClick={() => setCsv(SAMPLE)}>
          Load sample
        </Button>
      }
    >
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={"stake,odds,result\n50,6.4,loss\n50,5.2,win"}
        className="h-28 w-full resize-y rounded-md border border-slate-700 bg-slate-950/60 p-2 font-mono text-xs text-slate-200 outline-none focus:border-sky-500"
      />
      <p className="mt-1 text-[11px] text-slate-600">
        Columns: <code>stake</code>, <code>odds</code> (decimal), <code>result</code>{" "}
        (win/loss/push). Header synonyms like wager/price/outcome are accepted.
      </p>

      {summary && summary.bets > 0 && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Bets" value={`${summary.bets}`} sub={`${summary.wins}W-${summary.losses}L-${summary.pushes}P`} />
            <Stat label="Hit rate" value={pct(summary.hitRate)} sub="of decided bets" />
            <Stat
              label="ROI"
              value={pct(summary.roi)}
              sub={`${signedMoney(summary.totalProfit)} on ${money(summary.totalStaked)}`}
              tone={summary.roi >= 0 ? "good" : "bad"}
            />
            <Stat label="Unit σ" value={summary.unitStdDev.toFixed(2)} sub="variance / bet" />
          </div>
          {summary.errors.length > 0 && (
            <p className="mt-2 text-[11px] text-amber-400/80">
              {summary.errors.length} row issue(s): {summary.errors.slice(0, 2).join(" ")}
            </p>
          )}
        </>
      )}
      {summary && summary.bets === 0 && (
        <p className="mt-2 text-[11px] text-rose-400">
          {summary.errors[0] ?? "No valid rows found."}
        </p>
      )}
    </Card>
  );
}
